"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const cp = __importStar(require("child_process"));
class AINewsletterProvider {
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    isRunning = false;
    outputLines = [];
    waitingForInput = false;
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    setRunning(running) {
        this.isRunning = running;
        if (running) {
            this.outputLines = [];
        }
        this.refresh();
    }
    addOutput(line) {
        this.outputLines.push(line);
        this.refresh();
    }
    setWaitingForInput(waiting) {
        this.waitingForInput = waiting;
        this.refresh();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren() {
        const items = [];
        // Always show input button at top when waiting for input
        if (this.waitingForInput) {
            items.push(new AINewsletterItem('📝 ENTER INPUT HERE', {
                command: 'ai-newsletter.input',
                title: 'Input'
            }));
            items.push(new AINewsletterItem('--- Waiting for your input ---'));
        }
        // Start/Stop button
        if (this.isRunning) {
            items.push(new AINewsletterItem('⏹️ Stop', {
                command: 'ai-newsletter.stop',
                title: 'Stop'
            }));
        }
        else {
            items.push(new AINewsletterItem('🚀 Start Newsletter', {
                command: 'ai-newsletter.start',
                title: 'Start'
            }));
        }
        // Show all output
        this.outputLines.forEach(line => {
            items.push(new AINewsletterItem(line));
        });
        return Promise.resolve(items);
    }
}
class AINewsletterItem extends vscode.TreeItem {
    label;
    command;
    constructor(label, command) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.label = label;
        this.command = command;
    }
}
class AINewsletterController {
    context;
    treeDataProvider;
    currentProcess = null;
    constructor(context) {
        this.context = context;
        this.treeDataProvider = new AINewsletterProvider();
        vscode.window.registerTreeDataProvider('aiNewsletterSidebar', this.treeDataProvider);
        vscode.commands.registerCommand('ai-newsletter.start', () => this.start());
        vscode.commands.registerCommand('ai-newsletter.stop', () => this.stop());
        vscode.commands.registerCommand('ai-newsletter.input', () => this.input());
    }
    start() {
        if (this.currentProcess)
            return;
        const pythonScriptPath = path.join(this.context.extensionPath, 'python-src', 'main.py');
        this.treeDataProvider.setRunning(true);
        this.treeDataProvider.addOutput('Starting newsletter generator...');
        this.currentProcess = cp.spawn('python', [pythonScriptPath], {
            stdio: ['pipe', 'pipe', 'pipe']
        });
        this.currentProcess.stdout?.on('data', (data) => {
            const text = data.toString();
            text.split('\n').forEach((line) => {
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
    stop() {
        if (this.currentProcess) {
            this.currentProcess.kill();
            this.currentProcess = null;
            this.treeDataProvider.setRunning(false);
            this.treeDataProvider.setWaitingForInput(false);
            this.treeDataProvider.addOutput('Stopped by user');
        }
    }
    async input() {
        if (!this.currentProcess)
            return;
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
function activate(context) {
    new AINewsletterController(context);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map