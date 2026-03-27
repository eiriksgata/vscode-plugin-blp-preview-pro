import * as vscode from 'vscode';
import { BlpPreviewContext } from "../extension";
import MpqManager from '../mpq-manager';
import commandMap from '../command/helper/commands';
import { MpqTreeProvider } from './mpq/mpq-tree-provider';
import { W3XTreeProvider } from './w3x/w3x-tree-data-provider';

export function registerTreeProvider(context: vscode.ExtensionContext, ctx: BlpPreviewContext) {
    const mpqProvider = new MpqTreeProvider(MpqManager.instance);

    commandMap.set('blpPreview.selectMpqLocation', async () => {
        const selected = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Select Warcraft MPQ Path',
            filters: {
                MPQ: ['mpq'],
            },
        });

        if (!selected?.[0]) {
            return;
        }

        const loaded = await MpqManager.updateLocation(selected[0].fsPath);
        mpqProvider.refresh();
        if (loaded) {
            vscode.window.showInformationMessage(`Loaded MPQ archives: ${MpqManager.archiveNames.join(', ')}`);
        } else {
            vscode.window.showWarningMessage('No MPQ archives found at the selected path.');
        }
    });

    commandMap.set('blpPreview.reloadMpqArchives', async () => {
        const loaded = await MpqManager.reload(vscode.workspace.getConfiguration('blpPreview').get<string>('mpqLocation'));
        mpqProvider.refresh();
        if (loaded) {
            vscode.window.showInformationMessage(`Loaded MPQ archives: ${MpqManager.archiveNames.join(', ')}`);
        } else {
            vscode.window.showWarningMessage('No MPQ archives detected. Check blpPreview.mpqLocation.');
        }
    });

    commandMap.set('blpPreview.showMpqStatus', async () => {
        await MpqManager.waitUntilReady();
        const configured = vscode.workspace.getConfiguration('blpPreview').get<string>('mpqLocation') || '(not set)';
        const archives = MpqManager.archiveNames;
        const message = archives.length > 0
            ? `mpqLocation: ${configured}\nLoaded archives: ${archives.join(', ')}`
            : `mpqLocation: ${configured}\nLoaded archives: none`;
        vscode.window.showInformationMessage(message);
    });

    context.subscriptions.push(vscode.window.registerTreeDataProvider('blpPreview.mpqExplorer', mpqProvider));
    context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('mpq', mpqProvider));

    const treeProvider = new W3XTreeProvider(ctx);
    ctx.w3xTreeProvider = treeProvider;
    context.subscriptions.push(vscode.window.registerTreeDataProvider('blpPreview.w3xExplorer', treeProvider));
    context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('w3x', treeProvider));
}
