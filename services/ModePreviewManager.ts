import { App, Modal, Notice } from 'obsidian';
import { SyncMode } from '../settings/Settings';
import { TaskType } from '../models/ProcessingTask';

export interface SyncOutcomeEntry {
        id: string;
        filePath: string;
        mode: SyncMode;
        taskType: TaskType;
        status: 'success' | 'error';
        timestamp: number;
        message?: string;
        targets: {
                vectors: boolean;
                graph: boolean;
        };
}

export interface ModePreviewSummary {
        mode: SyncMode;
        successes: number;
        failures: number;
        lastSuccess?: number;
        lastFailure?: number;
        lastFile?: string;
}

export const describeSyncMode = (mode: SyncMode): string => {
        switch (mode) {
                case 'neo4j':
                        return 'Graph';
                case 'hybrid':
                        return 'Hybrid';
                default:
                        return 'Vector';
        }
};

class ModePreviewModal extends Modal {
        constructor(
                app: App,
                private readonly outcomes: SyncOutcomeEntry[],
                private readonly summaries: ModePreviewSummary[]
        ) {
                super(app);
        }

        onOpen(): void {
                this.titleEl.setText('Recent sync outcomes');
                this.contentEl.addClass('obsidian-rag-mode-modal');
                this.renderSummaries();
                this.renderOutcomeList();
        }

        private renderSummaries(): void {
                const summaryWrapper = this.contentEl.createEl('div', { cls: 'obsidian-rag-mode-modal-summary' });
                this.summaries.forEach(summary => {
                        const row = summaryWrapper.createEl('div', { cls: 'obsidian-rag-mode-modal-summary__row' });
                        row.createEl('strong', { text: describeSyncMode(summary.mode) });
                        row.createEl('span', {
                                text: `${summary.successes} success${summary.successes === 1 ? '' : 'es'} / ${summary.failures} failure${summary.failures === 1 ? '' : 's'}`
                        });
                });
        }

        private renderOutcomeList(): void {
                const list = this.contentEl.createEl('ul', { cls: 'obsidian-rag-mode-modal-list' });
                this.outcomes.slice(0, 10).forEach(outcome => {
                        const item = list.createEl('li', { cls: `obsidian-rag-mode-modal-entry is-${outcome.status}` });
                        const header = item.createEl('div', { cls: 'obsidian-rag-mode-modal-entry__header' });
                        header.createEl('span', { text: `${describeSyncMode(outcome.mode)} · ${outcome.taskType}` });
                        header.createEl('span', { text: new Date(outcome.timestamp).toLocaleString() });
                        item.createEl('div', { cls: 'obsidian-rag-mode-modal-entry__file', text: outcome.filePath });
                        const targets = item.createEl('div', { cls: 'obsidian-rag-mode-modal-entry__targets' });
                        targets.createEl('span', { text: outcome.targets.vectors ? 'Vectors ✓' : 'Vectors —' });
                        targets.createEl('span', { text: outcome.targets.graph ? 'Graph ✓' : 'Graph —' });
                        if (outcome.status === 'error' && outcome.message) {
                                item.createEl('div', { cls: 'obsidian-rag-mode-modal-entry__error', text: outcome.message });
                        }
                });
        }
}

export class ModePreviewManager {
        private outcomes: SyncOutcomeEntry[] = [];
        private maxEntries: number;
        private statusClickHandler: () => void;
        private ribbonClickHandler: (event: MouseEvent) => void;

        constructor(
                private app: App,
                private statusElement: HTMLElement,
                private ribbonElement?: HTMLElement | null,
                options: { maxEntries?: number } = {}
        ) {
                this.maxEntries = options.maxEntries ?? 10;
                this.statusClickHandler = () => this.showHistoryModal();
                this.ribbonClickHandler = (event: MouseEvent) => {
                        event.preventDefault();
                        this.showHistoryModal();
                };
                this.statusElement.classList.add('obsidian-rag-mode-preview');
                this.statusElement.addEventListener('click', this.statusClickHandler);
                if (this.ribbonElement) {
                        this.ribbonElement.classList.add('obsidian-rag-mode-preview-ribbon');
                        this.ribbonElement.addEventListener('click', this.ribbonClickHandler);
                }
                this.renderStatusWidget();
                this.renderRibbonWidget();
        }

        public destroy(): void {
                this.statusElement.removeEventListener('click', this.statusClickHandler);
                if (this.ribbonElement) {
                        this.ribbonElement.removeEventListener('click', this.ribbonClickHandler);
                }
        }

        public recordOutcome(outcome: SyncOutcomeEntry): void {
                this.outcomes.unshift(outcome);
                if (this.outcomes.length > this.maxEntries) {
                        this.outcomes.length = this.maxEntries;
                }
                this.renderStatusWidget();
                this.renderRibbonWidget();
        }

        public getRecentOutcomes(limit: number = 5): SyncOutcomeEntry[] {
                return this.outcomes.slice(0, limit).map(outcome => ({
                        ...outcome,
                        targets: { ...outcome.targets }
                }));
        }

        public getModeSummaries(): ModePreviewSummary[] {
                const summaries = new Map<SyncMode, ModePreviewSummary>();
                for (const outcome of this.outcomes) {
                        const existing = summaries.get(outcome.mode) ?? {
                                mode: outcome.mode,
                                successes: 0,
                                failures: 0
                        };
                        if (outcome.status === 'success') {
                                existing.successes += 1;
                                existing.lastSuccess = outcome.timestamp;
                        } else {
                                existing.failures += 1;
                                existing.lastFailure = outcome.timestamp;
                        }
                        existing.lastFile = outcome.filePath;
                        summaries.set(outcome.mode, existing);
                }
                const order: SyncMode[] = ['supabase', 'neo4j', 'hybrid'];
                return Array.from(summaries.values()).sort((a, b) => order.indexOf(a.mode) - order.indexOf(b.mode));
        }

        public showHistoryModal(): void {
                if (this.outcomes.length === 0) {
                        new Notice('No recent sync activity to display yet.');
                        return;
                }
                const modal = new ModePreviewModal(this.app, this.outcomes, this.getModeSummaries());
                modal.open();
        }

        private renderStatusWidget(): void {
                this.statusElement.replaceChildren();
                const summaries = this.getModeSummaries();
                if (!summaries.length) {
                        const placeholder = document.createElement('span');
                        placeholder.textContent = 'RAG sync: awaiting activity';
                        this.statusElement.appendChild(placeholder);
                        this.statusElement.setAttribute('aria-label', 'Waiting for sync events');
                        return;
                }
                const tooltipParts: string[] = [];
                summaries.forEach(summary => {
                        const pill = document.createElement('span');
                        pill.classList.add('obsidian-rag-mode-pill');
                        pill.dataset.mode = summary.mode;
                        pill.textContent = `${describeSyncMode(summary.mode)} ${summary.successes}✓/${summary.failures}⚠`;
                        this.statusElement.appendChild(pill);
                        tooltipParts.push(
                                `${describeSyncMode(summary.mode)}: ${summary.successes} success${summary.successes === 1 ? '' : 'es'}, ${summary.failures} failure${summary.failures === 1 ? '' : 's'}`
                        );
                });
                this.statusElement.setAttribute('aria-label', tooltipParts.join(' | '));
        }

        private renderRibbonWidget(): void {
                if (!this.ribbonElement) return;
                const latest = this.outcomes[0];
                const label = latest
                        ? `${describeSyncMode(latest.mode)} sync ${latest.status === 'success' ? 'succeeded' : 'failed'} at ${new Date(latest.timestamp).toLocaleTimeString()}`
                        : 'No recent sync activity';
                this.ribbonElement.setAttribute('aria-label', label);
                this.ribbonElement.classList.toggle('has-error', latest?.status === 'error');
        }
}
