import path from 'path';
import * as vscode from 'vscode';
import EditorProvider from '../custom-editor/EditorProvider';
import commandMap from "./helper/commands";

const supportedFileExtensions = ['.mdx', '.blp', '.tga', '.wav', '.mp3', '.slk', '.w3i', '.mmp', '.w3c'];

function resolveUri(uri?: vscode.Uri) {
    const target = uri ?? vscode.window.activeTextEditor?.document?.uri;
    if (!target) {
        vscode.window.showErrorMessage('No resource selected.');
        return null;
    }
    return target;
}

commandMap.set('blpPreviewPro.openMpq', async function (uri: vscode.Uri, selectURI: vscode.Uri[]) {
    const target = resolveUri(uri);
    if (!target) {
        return;
    }
    if (supportedFileExtensions.includes(path.extname(target.path).toLowerCase())) {
        // https://code.visualstudio.com/api/references/commands
        // https://vshaxe.github.io/vscode-extern/vscode/TextDocumentShowOptions.html#preview
        vscode.commands.executeCommand('vscode.openWith', target, EditorProvider.viewType + '.forMpq', { preview: true });
    } else {
        vscode.window.showTextDocument(target);
    }
});

commandMap.set('blpPreviewPro.openW3X', (uri?: vscode.Uri) => {
    const target = resolveUri(uri);
    if (!target) {
        return;
    }
    if (supportedFileExtensions.includes(path.extname(target.path).toLowerCase())) {
        // https://code.visualstudio.com/api/references/commands
        // https://vshaxe.github.io/vscode-extern/vscode/TextDocumentShowOptions.html#preview
        vscode.commands.executeCommand('vscode.openWith', target, EditorProvider.viewType + '.forMpq', { preview: true });
    } else {
        vscode.window.showTextDocument(target);
    }
});
