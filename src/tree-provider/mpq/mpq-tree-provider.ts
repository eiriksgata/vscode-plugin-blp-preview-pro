import * as vscode from 'vscode';
import ArchiveManager from '../../mpq-manager/manager';
import type MpqTreeHelperNode from './mpq-tree-helper-node';
import { MpqNode } from './mpq-node';
import { MpqItemNode } from './mpq-item-node';

class MpqActionItem extends vscode.TreeItem {
    constructor(label: string, command: vscode.Command, description?: string) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.command = command;
        this.description = description;
        this.contextValue = 'action';
    }
}

function helperNodeToMpqItemNodes(node: MpqTreeHelperNode) {
    return node.children.sort((a, b) => {
        if (a.isLeaf() && !b.isLeaf()) {
            return 1;
        } else if (!a.isLeaf() && b.isLeaf()) {
            return -1;
        } else {
            return a.name.localeCompare(b.name);
        }
    }).map(v => {
        return new MpqItemNode(v.name, v, v.isLeaf() ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed);
    });
}

export class MpqTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem>, vscode.TextDocumentContentProvider {
    private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | void> = new vscode.EventEmitter<vscode.TreeItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | void> = this._onDidChangeTreeData.event;

    constructor(private mpqManager: ArchiveManager) {
    }

    refresh() {
        this._onDidChangeTreeData.fire();
    }

    onDidChange?: vscode.Event<vscode.Uri>;

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
        if (!this.mpqManager) {
            vscode.window.showInformationMessage('mpq location is not a mpq file!');
            return Promise.resolve([]);
        }
        if (!element) {
            await this.mpqManager.task.catch(() => undefined);
            if (this.mpqManager.archives.length === 0) {
                return [
                    new MpqActionItem('Select Warcraft MPQ Path...', {
                        title: 'Select Warcraft MPQ Path',
                        command: 'blpPreview.selectMpqLocation',
                    }),
                    new MpqActionItem('Show MPQ Status', {
                        title: 'Show MPQ Status',
                        command: 'blpPreview.showMpqStatus',
                    }, 'No MPQ archives loaded'),
                ];
            }
            return this.mpqManager.archives.map(v => {
                return new MpqNode(v.name, v, vscode.TreeItemCollapsibleState.Collapsed);
            });
        } else if (element instanceof MpqNode) {
            const data = await element.buildTree();
            return helperNodeToMpqItemNodes(data);
        } else if (element instanceof MpqItemNode) {
            return helperNodeToMpqItemNodes(element.node);
        }
        return Promise.resolve([]);
    }

    async provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken): Promise<string> {
        const [first, ...rest] = uri.path.split(/\\/);
        const data = await this.mpqManager.get(rest.join('\\'));
        return Buffer.from(data).toString();
    }
}
