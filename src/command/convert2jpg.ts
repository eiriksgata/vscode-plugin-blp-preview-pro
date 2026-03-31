import path from 'path';
import * as vscode from 'vscode';
import { localize } from '../localize';
import blp2Image from './helper/blp2img';
import commandMap from './helper/commands';

commandMap.set('blpPreviewPro.convert2jpg', async function (uri: vscode.Uri, selectURI: vscode.Uri[]) {
    const data = vscode.workspace.getConfiguration('blpPreviewPro');
    const shouldReplaceExt = data?.convert2jpg ?? false;

    if (selectURI.length > 1) {
        const folders = await vscode.window.showOpenDialog({
            canSelectMany: false,
            openLabel: localize('blpPreviewPro.saveBlpFolder', 'Select'),
            canSelectFiles: false,
            canSelectFolders: true,
        });

        if (folders?.[0]) {
            for (const selectedUri of selectURI) {
                if (!selectedUri.fsPath.toLocaleLowerCase().endsWith('.blp')) {
                    continue;
                }

                const distPath = folders[0].with({
                    path: `${folders[0].path}/${path.basename(selectedUri.fsPath)}.jpg`,
                });

                this.edit.createFile(distPath, { ignoreIfExists: true });
                blp2Image(selectedUri.fsPath, distPath.fsPath, 'jpg');
            }

            await vscode.window.showInformationMessage(
                localize('blpPreviewPro.convertSuccess', 'convert success')
            );
    }

        return;
    }

    const distPath = uri.with({
        path: shouldReplaceExt ? uri.path.replace(/\.(blp)$/i, '.jpg') : `${uri.path}.jpg`,
    });
    this.edit.createFile(distPath, { ignoreIfExists: true });
    blp2Image(uri.fsPath, distPath.fsPath, 'jpg');
    await vscode.window.showInformationMessage(
        localize('blpPreviewPro.convertSuccess', 'convert success')
    );
});
