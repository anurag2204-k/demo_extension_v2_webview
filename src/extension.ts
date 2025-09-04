import * as vscode from 'vscode';
import * as path from 'path';
import * as cp from 'child_process';

class AINewsletterProvider implements vscode.TreeDataProvider<AINewsletterItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<AINewsletterItem | undefined | null | void> = new vscode.EventEmitter<AINewsletterItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<AINewsletterItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private isRunning: boolean = false;
    private outputLines: string[] = [];
    private waitingForInput: boolean = false;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    setRunning(running: boolean): void {
        this.isRunning = running;
        if (running) {
            this.outputLines = [];
        }
        this.refresh();
    }

    addOutput(line: string): void {
        this.outputLines.push(line);
        this.refresh();
    }

    setWaitingForInput(waiting: boolean): void {
        this.waitingForInput = waiting;
        this.refresh();
    }

    getTreeItem(element: AINewsletterItem): vscode.TreeItem {
        return element;
    }

    getChildren(): Thenable<AINewsletterItem[]> {
        const items: AINewsletterItem[] = [];

        // Always show input button at top when waiting for input
        if (this.waitingForInput) {
            items.push(new AINewsletterItem(
                '📝 ENTER INPUT HERE',
                {
                    command: 'ai-newsletter.input',
                    title: 'Input'
                }
            ));
            items.push(new AINewsletterItem('--- Waiting for your input ---'));
        }

        // Start/Stop button
        if (this.isRunning) {
            items.push(new AINewsletterItem(
                '⏹️ Stop',
                {
                    command: 'ai-newsletter.stop',
                    title: 'Stop'
                }
            ));
        } else {
            items.push(new AINewsletterItem(
                '🚀 Start Newsletter',
                {
                    command: 'ai-newsletter.start',
                    title: 'Start'
                }
            ));
        }

        // Show all output
        this.outputLines.forEach(line => {
            items.push(new AINewsletterItem(line));
        });

        return Promise.resolve(items);
    }
}

class AINewsletterItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly command?: vscode.Command
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
    }
}

class AINewsletterController {
    private treeDataProvider: AINewsletterProvider;
    private currentProcess: cp.ChildProcess | null = null;

    constructor(private context: vscode.ExtensionContext) {
        this.treeDataProvider = new AINewsletterProvider();
        
        vscode.window.registerTreeDataProvider('aiNewsletterSidebar', this.treeDataProvider);
        
        vscode.commands.registerCommand('ai-newsletter.start', () => this.start());
        vscode.commands.registerCommand('ai-newsletter.stop', () => this.stop());
        vscode.commands.registerCommand('ai-newsletter.input', () => this.input());
    }

    private start() {
        if (this.currentProcess) return;

        const pythonScriptPath = path.join(this.context.extensionPath, 'python-src', 'main.py');
        
        this.treeDataProvider.setRunning(true);
        this.treeDataProvider.addOutput('Starting newsletter generator...');

        this.currentProcess = cp.spawn('python', [pythonScriptPath], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        this.currentProcess.stdout?.on('data', (data) => {
            const text = data.toString();
            text.split('\n').forEach((line:string) => {
                if (line.trim()) {
                    this.treeDataProvider.addOutput(line);
                    
                    // Check if asking for input
                    if (line.includes('?') || line.includes(':')) {
                        this.treeDataProvider.setWaitingForInput(true);
                    }
                }
            });
        });

        this.currentProcess.stderr?.on('data', (data) => {
            this.treeDataProvider.addOutput(`Error: ${data.toString()}`);
        });

        this.currentProcess.on('close', (code) => {
            this.currentProcess = null;
            this.treeDataProvider.setRunning(false);
            this.treeDataProvider.setWaitingForInput(false);
            this.treeDataProvider.addOutput(`Process finished with code ${code}`);
        });

        this.currentProcess.on('error', (error) => {
            this.currentProcess = null;
            this.treeDataProvider.setRunning(false);
            this.treeDataProvider.setWaitingForInput(false);
            this.treeDataProvider.addOutput(`Error: ${error.message}`);
        });
    }

    private stop() {
        if (this.currentProcess) {
            this.currentProcess.kill();
            this.currentProcess = null;
            this.treeDataProvider.setRunning(false);
            this.treeDataProvider.setWaitingForInput(false);
            this.treeDataProvider.addOutput('Stopped by user');
        }
    }

    private async input() {
        if (!this.currentProcess) return;

        const input = await vscode.window.showInputBox({
            prompt: 'Enter your input:'
        });

        if (input !== undefined) {
            this.currentProcess.stdin?.write(input + '\n');
            this.treeDataProvider.addOutput(`> ${input}`);
            this.treeDataProvider.setWaitingForInput(false);
        }
    }
}

export function activate(context: vscode.ExtensionContext) {
    new AINewsletterController(context);
}

export function deactivate() {}