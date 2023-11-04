import * as vscode from 'vscode';

import type {GlobalStoreMessage, ViewMessage} from '../types.js';
import * as util from '../util.js';

import {BaseEditor} from './base.js';

export class YosysEditor extends BaseEditor {
    private static activeViews: Set<vscode.Webview> = new Set();

    public static getViewType() {
        return 'edacation.digitaljs';
    }

    protected getStylePaths() {
        return [['views', 'digitaljs', 'dist', 'assets', 'index.css']];
    }

    protected getScriptPaths() {
        return [['views', 'digitaljs', 'dist', 'assets', 'index.js']];
    }

    protected getHtmlStyles(webview: vscode.Webview): string {
        const styles = super.getHtmlStyles(webview);

        const fontUri = util.getWebviewUri(webview, this.context, [
            'views',
            'digitaljs',
            'dist',
            'assets',
            'codicon.ttf'
        ]);

        return `
            ${styles}
            <style>
                @font-face {
                    font-family: "codicon";
                    font-display: block;
                    src: url("${fontUri}") format("truetype");
                }
            </style>
        `;
    }

    protected onDidReceiveMessage(
        document: vscode.TextDocument,
        webview: vscode.Webview,
        message: ViewMessage | GlobalStoreMessage
    ): boolean {
        if (super.onDidReceiveMessage(document, webview, message)) {
            return true;
        }

        if (message.type === 'ready') {
            webview.postMessage({
                type: 'document',
                document: document.getText()
            });
            return true;
        } else if (message.type === 'broadcast') {
            if (YosysEditor.activeViews.size < 2) {
                // There are no views to broadcast to...
                vscode.window.showErrorMessage('You must have more than one tab open for this feature to work!');
            }

            for (const view of YosysEditor.activeViews) {
                if (view === webview) {
                    continue;
                }
                view.postMessage(message);
            }
            return true;
        } else if (message.type === 'requestSave') {
            // Save to project root, or the parent dir of the current editor's file if we can't find it
            const projectRoot = util.findProjectRoot(document.uri) || util.getParentUri(document.uri);
            const path = vscode.Uri.joinPath(projectRoot, message.data.defaultPath || '');

            util.offerSaveFile(message.data.fileContents, {
                defaultUri: path,
                filters: message.data?.filters
            }).then((path) => {
                if (!path) {
                    return;
                }
                this.showSaveNotification(path);
            });
            return true;
        }

        return false;
    }

    protected onSave(_document: vscode.TextDocument, _webview: vscode.Webview): void {
        // Do nothing
    }

    protected onClose(_document: vscode.TextDocument, webview: vscode.Webview): void {
        YosysEditor.activeViews.delete(webview);
    }

    protected update(document: vscode.TextDocument, webview: vscode.Webview, isDocumentChange: boolean) {
        YosysEditor.activeViews.add(webview);

        if (!isDocumentChange) {
            vscode.commands.executeCommand('edacation-projects.focus');
        }

        webview.postMessage({
            type: 'document',
            document: document.getText()
        });
    }

    async showSaveNotification(path: vscode.Uri) {
        const response = await vscode.window.showInformationMessage('Export success', 'Open file');
        if (!response) {
            return;
        }

        const doc = await vscode.workspace.openTextDocument(path);
        await vscode.window.showTextDocument(doc);
    }
}
