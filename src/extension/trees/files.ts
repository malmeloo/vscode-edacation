import * as vscode from 'vscode';

import type {Project, ProjectFile, Projects} from '../projects/index.js';

import {BaseTreeDataProvider} from './base.js';

abstract class FilesProvider extends BaseTreeDataProvider<ProjectFile> {
    getTreeItem(element: ProjectFile): vscode.TreeItem {
        const project = this.projects.getCurrent();
        if (!project) {
            throw new Error('Invalid state.');
        }

        return {
            resourceUri: element.uri,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            command: {
                title: 'Open file',
                command: 'vscode.open',
                arguments: [element.uri]
            }
        };
    }

    getChildren(element?: ProjectFile): ProjectFile[] {
        const project = this.projects.getCurrent();
        if (!project) {
            return [];
        }

        if (!element) {
            return this.getFiles(project);
        }

        return [];
    }

    abstract getFiles(project: Project): ProjectFile[];
}

export class InputFilesProvider extends FilesProvider {
    static getViewID() {
        return 'edacation-inputFiles';
    }

    constructor(context: vscode.ExtensionContext, projects: Projects) {
        super(context, projects);

        this.onDidChangeTreeData = projects.getInputFileEmitter().event;
    }

    getFiles(project: Project) {
        return project.getInputFileUris();
    }
}

export class OutputFilesProvider extends FilesProvider {
    static getViewID() {
        return 'edacation-outputFiles';
    }

    constructor(context: vscode.ExtensionContext, projects: Projects) {
        super(context, projects);

        this.onDidChangeTreeData = projects.getOutputFileEmitter().event;
    }

    getFiles(project: Project) {
        return project.getOutputFileUris();
    }
}
