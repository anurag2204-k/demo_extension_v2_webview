import * as vscode from 'vscode';
import * as path from 'path';
import * as cp from 'child_process';

interface NewsletterStatus {
    isRunning: boolean;
    waitingForInput: boolean;
    waitingForChoice: boolean;
    currentStep: string;
    progress: number;
    totalSteps: number;
    choices: string[];
    lastPrompt: string;
    showHeader: boolean; // Add this new property
}

class AINewsletterWebviewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'aiNewsletterSidebar';

    private _view?: vscode.WebviewView;

    private status: NewsletterStatus = {
        isRunning: false,
        waitingForInput: false,
        waitingForChoice: false,
        currentStep: 'Ready',
        progress: 0,
        totalSteps: 4,
        choices: [],
        lastPrompt: '',
        showHeader: true // Initialize as visible
    };
    private outputLines: string[] = [];
    private lastTopic: string = '';

    constructor(
        private readonly _extensionUri: vscode.Uri,
    ) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'start':
                        vscode.commands.executeCommand('ai-newsletter.start');
                        break;
                    case 'stop':
                        vscode.commands.executeCommand('ai-newsletter.stop');
                        break;
                    case 'input':
                        vscode.commands.executeCommand('ai-newsletter.input', message.data);
                        break;
                    case 'choice':
                        vscode.commands.executeCommand('ai-newsletter.input', message.data);
                        break;
                    case 'toggleHeader':
                        this.toggleHeader();
                        break;
                }
            }
        );
    }

    public toggleHeader(): void {
        this.status.showHeader = !this.status.showHeader;
        this.updateWebview();
    }

    public setRunning(running: boolean): void {
        this.status.isRunning = running;
        if (running) {
            this.outputLines = [];
            this.status.currentStep = 'Initializing...';
            this.status.progress = 0;
        } else {
            this.status.currentStep = 'Ready';
            this.status.progress = 0;
        }
        this.updateWebview();
    }

    public addOutput(line: string): void {
        this.outputLines.push(line);

        // Update status based on output
        if (line.includes('Generating section headings')) {
            this.status.currentStep = 'Generating Headings';
            this.status.progress = 1;
        } else if (line.includes('current section headings')) {
            this.status.currentStep = 'Planning Sections';
            this.status.progress = 2;
        } else if (line.includes('Generating content')) {
            this.status.currentStep = 'Writing Content';
            this.status.progress = 3;
        } else if (line.includes('Final Newsletter')) {
            this.status.currentStep = 'Finalizing';
            this.status.progress = 4;
        }

        // ONLY check for choices if "Please choose" exists in the line
        if (line.includes('Please choose')) {
            this.status.lastPrompt = line;
            const choices = this.extractChoicesFromPrompt(line);
            if (choices && choices.length > 0) {
                this.status.waitingForChoice = true;
                this.status.waitingForInput = false;
                this.status.choices = choices;
            } else {
                // Fallback to regular input if no choices detected
                this.status.waitingForInput = true;
                this.status.waitingForChoice = false;
            }
        }
        // For all other lines, check for regular input prompts
        else if (line.includes('?') || line.includes(':') || line.includes('Enter')) {
            // Only set waiting for input if not already waiting for choice
            if (!this.status.waitingForChoice) {
                this.status.waitingForInput = true;
            }
        }
        // Reset waiting states if we see "Invalid action" but no "Please choose" on same line
        else if (line.includes('Invalid action')) {
            this.status.waitingForInput = false;
            this.status.waitingForChoice = false;
            this.status.choices = [];
            this.status.lastPrompt = '';
        }

        this.updateWebview();
    }

    private extractChoicesFromPrompt(prompt: string): string[] {
        // Pattern to match choices like 'add', 'edit', 'delete', or 'continue'
        const quotedChoicesPattern = /'([^']+)'/g;
        let choices: string[] = [];
        let match;

        while ((match = quotedChoicesPattern.exec(prompt)) !== null) {
            choices.push(match[1]);
        }

        // If no quoted choices found, try other patterns
        if (choices.length === 0) {
            // Pattern for numbered choices like "1, 2, 3, 4 or 5"
            const numbersMatch = prompt.match(/\d+(?:,\s*\d+)*(?:\s*or\s*\d+)?/);
            if (numbersMatch) {
                const numbers = numbersMatch[0].match(/\d+/g);
                if (numbers) {
                    choices = numbers;
                }
            }
            // Pattern for yes/no
            else if (prompt.toLowerCase().includes('yes') && prompt.toLowerCase().includes('no')) {
                choices = ['yes', 'no'];
            }
        }

        return choices;
    }

    public setWaitingForInput(waiting: boolean): void {
        if (!this.status.waitingForChoice) {
            this.status.waitingForInput = waiting;
        }
        this.updateWebview();
    }

    public clearWaitingState(): void {
        this.status.waitingForInput = false;
        this.status.waitingForChoice = false;
        this.status.choices = [];
        this.status.lastPrompt = '';
        this.updateWebview();
    }

    public setTopic(topic: string): void {
        if (this.lastTopic === '') {
            this.lastTopic = topic;
        }
        this.updateWebview();
    }

    private updateWebview(): void {
        if (this._view) {
            this._view.webview.html = this._getHtmlForWebview(this._view.webview);
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
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
                    height: 100vh;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }
                
                .header {
                    font-size: 16px;
                    font-weight: 600;
                    margin-bottom: 16px;
                    color: var(--vscode-sideBarTitle-foreground);
                    border-bottom: 1px solid var(--vscode-sideBar-border);
                    padding-bottom: 8px;
                    flex-shrink: 0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .header-title {
                    flex: 1;
                }
                
                .header-controls {
                    display: flex;
                    gap: 8px;
                }
                
                .icon-button {
                    width: 28px;
                    height: 28px;
                    padding: 4px;
                    border: 1px solid var(--vscode-button-border);
                    border-radius: 4px;
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    cursor: pointer;
                    font-size: 14px;
                    font-family: inherit;
                    transition: background-color 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .icon-button:hover {
                    background: var(--vscode-button-hoverBackground);
                }
                
                .collapsible-section {
                    transition: all 0.3s ease;
                    overflow: hidden;
                }
                
                .collapsible-section.hidden {
                    max-height: 0;
                    margin: 0;
                    padding: 0;
                    border: none;
                    opacity: 0;
                }
                
                .status-section {
                    margin-bottom: 16px;
                    padding: 12px;
                    background: var(--vscode-sideBar-background);
                    border: 1px solid var(--vscode-sideBar-border);
                    border-radius: 6px;
                    flex-shrink: 0;
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
                
                .actions {
                    flex-shrink: 0;
                    margin-bottom: 16px;
                }
                
                .input-actions {
                    flex-shrink: 0;
                    margin-top: 12px;
                    padding-top: 12px;
                    border-top: 1px solid var(--vscode-sideBar-border);
                }
                
                .choice-actions {
                    flex-shrink: 0;
                    margin-top: 12px;
                    padding: 12px;
                    background: var(--vscode-textCodeBlock-background);
                    border: 1px solid var(--vscode-textLink-foreground);
                    border-radius: 6px;
                }
                
                .choice-prompt {
                    font-size: 14px;
                    color: var(--vscode-foreground);
                    margin-bottom: 12px;
                    font-weight: 500;
                }
                
                .choice-buttons {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                }
                
                .choice-button {
                    flex: 1;
                    min-width: 0;
                    padding: 8px 12px;
                    border: 1px solid var(--vscode-button-border);
                    border-radius: 4px;
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    cursor: pointer;
                    font-size: 12px;
                    font-family: inherit;
                    transition: all 0.2s;
                    text-align: center;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                /* For 2 choices, make them equal width */
                .choice-buttons:has(.choice-button:nth-child(2):last-child) .choice-button {
                    flex-basis: calc(50% - 3px);
                }
                
                /* For 3 choices, make them equal width */
                .choice-buttons:has(.choice-button:nth-child(3):last-child) .choice-button {
                    flex-basis: calc(33.33% - 4px);
                }
                
                /* For 4+ choices, wrap to new lines if needed */
                .choice-buttons:has(.choice-button:nth-child(4)) .choice-button {
                    flex-basis: calc(50% - 3px);
                }
                
                .choice-button:hover {
                    background: var(--vscode-button-hoverBackground);
                    transform: scale(1.02);
                }
                
                .choice-button:active {
                    transform: scale(0.98);
                }
                
                .input-container {
                    display: flex;
                    gap: 8px;
                    margin-bottom: 8px;
                }
                
                .input-field {
                    flex: 1;
                    padding: 10px;
                    border: 1px solid var(--vscode-input-border);
                    border-radius: 4px;
                    background: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    font-family: inherit;
                    font-size: 14px;
                    outline: none;
                }
                
                .input-field:focus {
                    border-color: var(--vscode-focusBorder);
                    box-shadow: 0 0 0 1px var(--vscode-focusBorder);
                }
                
                .input-field::placeholder {
                    color: var(--vscode-input-placeholderForeground);
                }
                
                .send-button {
                    padding: 10px 16px;
                    border: 1px solid var(--vscode-button-border);
                    border-radius: 4px;
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    cursor: pointer;
                    font-size: 14px;
                    font-family: inherit;
                    transition: background-color 0.2s;
                    white-space: nowrap;
                }
                
                .send-button:hover:not(:disabled) {
                    background: var(--vscode-button-hoverBackground);
                }
                
                .send-button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                
                .input-prompt {
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                    margin-bottom: 8px;
                    padding: 4px 0;
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
                
                .output-section {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    min-height: 0;
                }
                
                .output-header {
                    font-weight: 600;
                    margin-bottom: 8px;
                    color: var(--vscode-sideBarSectionHeader-foreground);
                    flex-shrink: 0;
                }
                
                .output-content {
                    flex: 1;
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
                    padding: 6px 8px;
                    border-radius: 4px;
                    word-wrap: break-word;
                    white-space: pre-wrap;
                    line-height: 1.4;
                    transition: all 0.3s ease;
                }
                
                .output-line.recent {
                    background: var(--vscode-editor-selectionBackground);
                    border-left: 3px solid var(--vscode-textLink-foreground);
                    animation: highlightFade 3s ease-out;
                }
                
                .output-line.newest {
                    background: var(--vscode-textCodeBlock-background);
                    border-left: 3px solid var(--vscode-charts-green);
                    animation: newContentGlow 2s ease-out;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                
                @keyframes highlightFade {
                    0% { 
                        background: var(--vscode-charts-yellow);
                        transform: scale(1.02);
                    }
                    100% { 
                        background: var(--vscode-editor-selectionBackground);
                        transform: scale(1);
                    }
                }
                
                @keyframes newContentGlow {
                    0% { 
                        background: var(--vscode-charts-green);
                        opacity: 0.9;
                        transform: translateX(5px);
                    }
                    100% { 
                        background: var(--vscode-textCodeBlock-background);
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                
                .output-line.user-input {
                    background: var(--vscode-textCodeBlock-background);
                    border-left: 3px solid var(--vscode-textLink-foreground);
                    font-weight: 500;
                }
                
                .output-line.error {
                    background: var(--vscode-inputValidation-errorBackground);
                    color: var(--vscode-inputValidation-errorForeground);
                    border-left: 3px solid var(--vscode-charts-red);
                }
                
                .spinning {
                    display: inline-block;
                    animation: spin 1s linear infinite;
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                /* Scrollbar styling */
                .output-content::-webkit-scrollbar {
                    width: 8px;
                }
                
                .output-content::-webkit-scrollbar-track {
                    background: var(--vscode-scrollbarSlider-background);
                }
                
                .output-content::-webkit-scrollbar-thumb {
                    background: var(--vscode-scrollbarSlider-hoverBackground);
                    border-radius: 4px;
                }
                
                .output-content::-webkit-scrollbar-thumb:hover {
                    background: var(--vscode-scrollbarSlider-activeBackground);
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="header-title">🤖 AI Newsletter Generator</div>
                <div class="header-controls">
                    <button class="icon-button" onclick="refreshPage()" title="Refresh">
                        🔄
                    </button>
                    <button class="icon-button" onclick="toggleHeader()" title="${this.status.showHeader ? 'Hide Header' : 'Show Header'}">
                        ${this.status.showHeader ? '👁️‍🗨️' : '👁️'}
                    </button>
                </div>
            </div>
            
            <div class="collapsible-section ${this.status.showHeader ? '' : 'hidden'}">
                <div class="status-section">
                    <div class="status-text">
                        Status: ${this.status.isRunning ? '<span class="spinning">⚡</span> Running' : '⚪ Ready'} - ${this.status.currentStep}
                    </div>
                    
                    ${this.lastTopic ? `<div class="topic">📖 Topic: "${this.lastTopic}"</div>` : ''}
                </div>
                
                <div class="actions">
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
            </div>
            
            ${this.outputLines.length > 0 ? `
            <div class="output-section">
                <div class="output-header">📋 Output (${this.outputLines.length} lines)</div>
                <div class="output-content" id="outputContent">
                    ${this.outputLines.map((line, index) => {
            const isNewest = index === this.outputLines.length - 1; // Most recent line
            const isRecent = index >= this.outputLines.length - 3; // Last 3 lines
            const isUserInput = line.includes('You:');
            const isError = line.includes('Error') || line.includes('error');

            let className = 'output-line';
            if (isNewest && !isUserInput) {
                className += ' newest'; // Special highlighting for newest content
            } else if (isRecent) {
                className += ' recent'; // Standard highlighting for recent content
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
            
            ${this.status.waitingForChoice ? `
            <div class="choice-actions">
                <div class="choice-prompt">🤔 ${this.status.lastPrompt}</div>
                <div class="choice-buttons">
                    ${this.status.choices.map(choice => `
                        <button class="choice-button" onclick="sendChoice('${choice}')">
                            ${this.getChoiceEmoji(choice)} ${choice.charAt(0).toUpperCase() + choice.slice(1)}
                        </button>
                    `).join('')}
                </div>
            </div>
            ` : this.status.waitingForInput ? `
            <div class="input-actions">
                <div class="input-prompt">💬 Please provide your input:</div>
                <div class="input-container">
                    <input type="text" class="input-field" id="userInput" placeholder="Type your response here..." />
                    <button class="send-button" onclick="sendInput()">Send</button>
                </div>
            </div>
            ` : ''}
            
            <script>
                const vscode = acquireVsCodeApi();
                
                function sendMessage(command, data = null) {
                    vscode.postMessage({ command: command, data: data });
                }
                
                function toggleHeader() {
                    vscode.postMessage({ command: 'toggleHeader' });
                }
                
                function refreshPage() {
                    // Add refresh functionality if needed
                    window.location.reload();
                }
                
                function sendChoice(choice) {
                    vscode.postMessage({ command: 'choice', data: choice });
                    
                    // Disable all choice buttons to prevent multiple clicks
                    const choiceButtons = document.querySelectorAll('.choice-button');
                    choiceButtons.forEach(btn => {
                        btn.disabled = true;
                        if (btn.textContent.includes(choice)) {
                            btn.style.background = 'var(--vscode-charts-green)';
                            btn.textContent = '✓ ' + btn.textContent;
                        }
                    });
                }
                
                function sendInput() {
                    const inputField = document.getElementById('userInput');
                    const input = inputField.value.trim();
                    
                    if (input) {
                        sendMessage('input', input);
                        inputField.value = '';
                        inputField.disabled = true;
                        
                        const sendButton = inputField.nextElementSibling;
                        sendButton.disabled = true;
                        sendButton.textContent = 'Sent ✓';
                    }
                }
                
                // Handle Enter key in input field
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        const inputField = document.getElementById('userInput');
                        if (inputField && document.activeElement === inputField) {
                            e.preventDefault();
                            sendInput();
                        }
                    }
                });
                
                // Auto-scroll to bottom when content updates
                function scrollToBottom() {
                    const outputContent = document.getElementById('outputContent');
                    if (outputContent) {
                        outputContent.scrollTop = outputContent.scrollHeight;
                    }
                }
                
                // Scroll to bottom on page load
                window.addEventListener('load', () => {
                    scrollToBottom();
                    
                    const inputField = document.getElementById('userInput');
                    if (inputField) {
                        inputField.focus();
                    }
                });
                
                // Watch for content changes and scroll
                const observer = new MutationObserver(scrollToBottom);
                window.addEventListener('load', () => {
                    const outputContent = document.getElementById('outputContent');
                    if (outputContent) {
                        observer.observe(outputContent, { childList: true, subtree: true });
                    }
                });
            </script>
        </body>
        </html>`;
    }

    private getChoiceEmoji(choice: string): string {
        const emojiMap: { [key: string]: string } = {
            'add': '➕',
            'edit': '✏️',
            'delete': '🗑️',
            'continue': '▶️',
            'accept': '✅',
            'regenerate': '🔄',
            'yes': '👍',
            'no': '👎',
            '1': '1️⃣',
            '2': '2️⃣',
            '3': '3️⃣',
            '4': '4️⃣',
            '5': '5️⃣'
        };
        return emojiMap[choice.toLowerCase()] || '🔘';
    }

    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}

class AINewsletterController {
    private webviewProvider: AINewsletterWebviewProvider;
    private currentProcess: cp.ChildProcess | null = null;

    constructor(private context: vscode.ExtensionContext) {
        this.webviewProvider = new AINewsletterWebviewProvider(this.context.extensionUri);

        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider(
                AINewsletterWebviewProvider.viewType,
                this.webviewProvider
            )
        );

        vscode.commands.registerCommand('ai-newsletter.start', () => this.start());
        vscode.commands.registerCommand('ai-newsletter.stop', () => this.stop());
        vscode.commands.registerCommand('ai-newsletter.input', (inputData) => this.input(inputData));
    }

    private start() {
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
            text.split('\n').forEach((line: string) => {
                if (line.trim()) {
                    this.webviewProvider.addOutput(line);

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
            this.webviewProvider.clearWaitingState();
            this.webviewProvider.addOutput(`✅ Process finished with code ${code}`);
        });

        this.currentProcess.on('error', (error) => {
            this.currentProcess = null;
            this.webviewProvider.setRunning(false);
            this.webviewProvider.clearWaitingState();
            this.webviewProvider.addOutput(`❌ Error: ${error.message}`);
        });
    }

    private stop() {
        if (this.currentProcess) {
            this.currentProcess.kill();
            this.currentProcess = null;
            this.webviewProvider.setRunning(false);
            this.webviewProvider.clearWaitingState();
            this.webviewProvider.addOutput('⏹️ Stopped by user');
        }
    }

    private async input(inputData?: string) {
        if (!this.currentProcess) {
            return;
        }

        let input: string | undefined;

        if (inputData) {
            input = inputData;
        } else {
            input = await vscode.window.showInputBox({
                prompt: 'Enter your input:',
                placeHolder: 'Type your response here...',
                ignoreFocusOut: true
            });
        }

        if (input !== undefined && input.trim()) {
            this.currentProcess.stdin?.write(input + '\n');
            this.webviewProvider.addOutput(`💬 You: ${input}`);

            // Clear waiting states after input is sent
            this.webviewProvider.clearWaitingState();

            if (input.trim()) {
                this.webviewProvider.setTopic(input);
            }
        }
    }
}

export function activate(context: vscode.ExtensionContext) {
    new AINewsletterController(context);
}

export function deactivate() { }
