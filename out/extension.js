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
class AINewsletterWebviewProvider {
    _extensionUri;
    static viewType = 'aiNewsletterSidebar';
    _view;
    status = {
        isRunning: false,
        waitingForInput: false,
        currentStep: 'Ready',
        progress: 0,
        totalSteps: 4
    };
    outputLines = [];
    lastTopic = '';
    constructor(_extensionUri) {
        this._extensionUri = _extensionUri;
    }
    resolveWebviewView(webviewView, context, _token) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri
            ]
        };
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'start':
                    vscode.commands.executeCommand('ai-newsletter.start');
                    break;
                case 'stop':
                    vscode.commands.executeCommand('ai-newsletter.stop');
                    break;
                case 'input':
                    vscode.commands.executeCommand('ai-newsletter.input');
                    break;
            }
        });
    }
    setRunning(running) {
        this.status.isRunning = running;
        if (running) {
            this.outputLines = [];
            this.status.currentStep = 'Initializing...';
            this.status.progress = 0;
        }
        else {
            this.status.currentStep = 'Ready';
            this.status.progress = 0;
        }
        this.updateWebview();
    }
    addOutput(line) {
        this.outputLines.push(line);
        // Update status based on output
        if (line.includes('Generating section headings')) {
            this.status.currentStep = 'Generating Headings';
            this.status.progress = 1;
        }
        else if (line.includes('current section headings')) {
            this.status.currentStep = 'Planning Sections';
            this.status.progress = 2;
        }
        else if (line.includes('Generating content')) {
            this.status.currentStep = 'Writing Content';
            this.status.progress = 3;
        }
        else if (line.includes('Final Newsletter')) {
            this.status.currentStep = 'Finalizing';
            this.status.progress = 4;
        }
        this.updateWebview();
    }
    setWaitingForInput(waiting) {
        this.status.waitingForInput = waiting;
        this.updateWebview();
    }
    setTopic(topic) {
        this.lastTopic = topic;
        this.updateWebview();
    }
    updateWebview() {
        if (this._view) {
            this._view.webview.html = this._getHtmlForWebview(this._view.webview);
        }
    }
    _getHtmlForWebview(webview) {
        const progressPercentage = this.status.progress > 0 ? Math.round((this.status.progress / this.status.totalSteps) * 100) : 0;
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>AI Newsletter Generator</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    font-size: var(--vscode-font-size);
                    color: var(--vscode-foreground);
                    background: var(--vscode-sideBar-background);
                    margin: 0;
                    padding: 16px;
                    line-height: 1.5;
                }
                
                .header {
                    font-size: 16px;
                    font-weight: 600;
                    margin-bottom: 16px;
                    color: var(--vscode-sideBarTitle-foreground);
                    border-bottom: 1px solid var(--vscode-sideBar-border);
                    padding-bottom: 8px;
                }
                
                .status-section {
                    margin-bottom: 16px;
                    padding: 12px;
                    background: var(--vscode-sideBar-background);
                    border: 1px solid var(--vscode-sideBar-border);
                    border-radius: 6px;
                }
                
                .status-text {
                    margin-bottom: 8px;
                    font-weight: 500;
                }
                
                .topic {
                    color: var(--vscode-textLink-foreground);
                    font-style: italic;
                    margin-bottom: 8px;
                }
                
                .progress-bar {
                    width: 100%;
                    height: 8px;
                    background: var(--vscode-progressBar-background);
                    border-radius: 4px;
                    overflow: hidden;
                    margin: 8px 0;
                }
                
                .progress-fill {
                    height: 100%;
                    background: var(--vscode-progressBar-foreground);
                    transition: width 0.3s ease;
                }
                
                .button {
                    width: 100%;
                    padding: 10px;
                    margin: 6px 0;
                    border: 1px solid var(--vscode-button-border);
                    border-radius: 4px;
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    cursor: pointer;
                    font-size: 14px;
                    font-family: inherit;
                    transition: background-color 0.2s;
                }
                
                .button:hover {
                    background: var(--vscode-button-hoverBackground);
                }
                
                .button.primary {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                }
                
                .button.danger {
                    background: var(--vscode-inputValidation-errorBackground);
                    color: var(--vscode-inputValidation-errorForeground);
                }
                
                .button.warning {
                    background: var(--vscode-inputValidation-warningBackground);
                    color: var(--vscode-inputValidation-warningForeground);
                    animation: pulse 2s infinite;
                }
                
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.7; }
                }
                
                .output-section {
                    margin-top: 16px;
                }
                
                .output-header {
                    font-weight: 600;
                    margin-bottom: 8px;
                    color: var(--vscode-sideBarSectionHeader-foreground);
                }
                
                .output-content {
                    max-height: 400px;
                    overflow-y: auto;
                    border: 1px solid var(--vscode-sideBar-border);
                    border-radius: 4px;
                    padding: 8px;
                    background: var(--vscode-editor-background);
                    font-family: var(--vscode-editor-font-family);
                    font-size: var(--vscode-editor-font-size);
                }
                
                .output-line {
                    margin: 4px 0;
                    padding: 4px 8px;
                    border-radius: 3px;
                    word-wrap: break-word;
                    white-space: pre-wrap;
                    line-height: 1.4;
                }
                
                .output-line.recent {
                    background: var(--vscode-editor-selectionBackground);
                    opacity: 0.8;
                }
                
                .output-line.user-input {
                    background: var(--vscode-textCodeBlock-background);
                    border-left: 3px solid var(--vscode-textLink-foreground);
                    font-weight: 500;
                }
                
                .output-line.error {
                    background: var(--vscode-inputValidation-errorBackground);
                    color: var(--vscode-inputValidation-errorForeground);
                }
                
                .spinning {
                    display: inline-block;
                    animation: spin 1s linear infinite;
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        </head>
        <body>
            <div class="header">
                🤖 AI Newsletter Generator
            </div>
            
            <div class="status-section">
                <div class="status-text">
                    Status: ${this.status.isRunning ? '<span class="spinning">⚡</span> Running' : '⚪ Ready'} - ${this.status.currentStep}
                </div>
                
                ${this.lastTopic ? `<div class="topic">📖 Topic: "${this.lastTopic}"</div>` : ''}
                
                ${this.status.isRunning && this.status.progress > 0 ? `
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progressPercentage}%"></div>
                </div>
                <div style="text-align: center; font-size: 12px; color: var(--vscode-descriptionForeground);">
                    ${progressPercentage}% complete (Step ${this.status.progress}/${this.status.totalSteps})
                </div>
                ` : ''}
            </div>
            
            <div class="actions">
                ${this.status.waitingForInput ? `
                <button class="button warning" onclick="sendMessage('input')">
                    ⌨️ PROVIDE INPUT REQUIRED
                </button>
                ` : ''}
                
                ${this.status.isRunning ? `
                <button class="button danger" onclick="sendMessage('stop')">
                    ⏹️ Stop Generation
                </button>
                ` : `
                <button class="button primary" onclick="sendMessage('start')">
                    🚀 Start Generation
                </button>
                `}
            </div>
            
            ${this.outputLines.length > 0 ? `
            <div class="output-section">
                <div class="output-header">📋 Output (${this.outputLines.length} lines)</div>
                <div class="output-content">
                    ${this.outputLines.map((line, index) => {
            const isRecent = index >= this.outputLines.length - 3;
            const isUserInput = line.includes('You:');
            const isError = line.includes('Error') || line.includes('error');
            let className = 'output-line';
            if (isRecent) {
                className += ' recent';
            }
            if (isUserInput) {
                className += ' user-input';
            }
            if (isError) {
                className += ' error';
            }
            return `<div class="${className}">${this.escapeHtml(line)}</div>`;
        }).join('')}
                </div>
            </div>
            ` : ''}
            
            <script>
                const vscode = acquireVsCodeApi();
                
                function sendMessage(command) {
                    vscode.postMessage({ command: command });
                }
            </script>
        </body>
        </html>`;
    }
    escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}
class AINewsletterController {
    context;
    webviewProvider;
    currentProcess = null;
    constructor(context) {
        this.context = context;
        this.webviewProvider = new AINewsletterWebviewProvider(this.context.extensionUri);
        context.subscriptions.push(vscode.window.registerWebviewViewProvider(AINewsletterWebviewProvider.viewType, this.webviewProvider));
        vscode.commands.registerCommand('ai-newsletter.start', () => this.start());
        vscode.commands.registerCommand('ai-newsletter.stop', () => this.stop());
        vscode.commands.registerCommand('ai-newsletter.input', () => this.input());
    }
    start() {
        if (this.currentProcess) {
            return;
        }
        const pythonScriptPath = path.join(this.context.extensionPath, 'python-src', 'main.py');
        this.webviewProvider.setRunning(true);
        this.webviewProvider.addOutput('🚀 Starting newsletter generator...');
        this.currentProcess = cp.spawn('python', [pythonScriptPath], {
            stdio: ['pipe', 'pipe', 'pipe']
        });
        this.currentProcess.stdout?.on('data', (data) => {
            const text = data.toString();
            text.split('\n').forEach((line) => {
                if (line.trim()) {
                    this.webviewProvider.addOutput(line);
                    // Check if asking for input
                    if (line.includes('?') || line.includes(':') || line.includes('Enter')) {
                        this.webviewProvider.setWaitingForInput(true);
                    }
                    // Extract topic from the input
                    if (line.includes('topic of your newsletter')) {
                        this.webviewProvider.setWaitingForInput(true);
                    }
                }
            });
        });
        this.currentProcess.stderr?.on('data', (data) => {
            this.webviewProvider.addOutput(`❌ Error: ${data.toString()}`);
        });
        this.currentProcess.on('close', (code) => {
            this.currentProcess = null;
            this.webviewProvider.setRunning(false);
            this.webviewProvider.setWaitingForInput(false);
            this.webviewProvider.addOutput(`✅ Process finished with code ${code}`);
        });
        this.currentProcess.on('error', (error) => {
            this.currentProcess = null;
            this.webviewProvider.setRunning(false);
            this.webviewProvider.setWaitingForInput(false);
            this.webviewProvider.addOutput(`❌ Error: ${error.message}`);
        });
    }
    stop() {
        if (this.currentProcess) {
            this.currentProcess.kill();
            this.currentProcess = null;
            this.webviewProvider.setRunning(false);
            this.webviewProvider.setWaitingForInput(false);
            this.webviewProvider.addOutput('⏹️ Stopped by user');
        }
    }
    async input() {
        if (!this.currentProcess) {
            return;
        }
        const input = await vscode.window.showInputBox({
            prompt: 'Enter your input:',
            placeHolder: 'Type your response here...',
            ignoreFocusOut: true
        });
        if (input !== undefined) {
            this.currentProcess.stdin?.write(input + '\n');
            this.webviewProvider.addOutput(`💬 You: ${input}`);
            this.webviewProvider.setWaitingForInput(false);
            // If it's a topic, store it
            if (input.trim() && !this.webviewProvider['lastTopic']) {
                this.webviewProvider.setTopic(input);
            }
        }
    }
}
function activate(context) {
    new AINewsletterController(context);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map