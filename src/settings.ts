import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import { DEFAULT_SETTINGS, GEMINI_MODELS } from './constants';

import { GeminiModel } from './types';
import { YouTubeSummarizerPlugin } from './main';

/**
 * Represents the settings tab for the YouTube Summarizer Plugin.
 * This class extends the PluginSettingTab and provides a user interface
 * for configuring the plugin's settings.
 */
export class SettingsTab extends PluginSettingTab {
	plugin: YouTubeSummarizerPlugin;

	/**
	 * Creates an instance of SettingsTab.
	 * @param app - The Obsidian app instance.
	 * @param plugin - The YouTube Summarizer Plugin instance.
	 */
	constructor(app: App, plugin: YouTubeSummarizerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	/**
	 * Displays the settings tab UI.
	 * This method is responsible for rendering the settings controls
	 * and handling user interactions.
	 */
	async display(): Promise<void> {
		const { containerEl } = this;
		containerEl.empty();

		// Setting for Gemini API Key
		new Setting(containerEl)
			.setName('Gemini API key')
			.setDesc('Enter your Gemini API key')
			.addText((text) =>
				text
					.setPlaceholder('Enter API key')
					.setValue(this.plugin.settings.geminiApiKey)
					.onChange(async (value) => {
						await this.plugin.updateSettings({
							geminiApiKey: value,
						});
					})
			);

		// Create a loading message for models
		const modelSetting = new Setting(containerEl)
			.setName('Gemini model')
			.setDesc('Select Gemini model version');
		
		const createModelDropdown = async () => {
			// Clear existing components if any
			modelSetting.components = [];
			
			// Try to fetch models from API if API key is available
			if (this.plugin.settings.geminiApiKey) {
				try {
					// Show loading message
					const loadingEl = modelSetting.descEl.createSpan();
					loadingEl.setText(' (Loading available models...)');

					// Get models from the Gemini API
					const geminiService = this.plugin.getGeminiService();
					const availableModels = await geminiService.getGeminiModels();

					// Remove loading message
					loadingEl.remove();

					// Add dropdown with fetched models
					if (availableModels.length > 0) {
						modelSetting.addDropdown((dropdown) =>
							dropdown
								.addOptions(
									Object.fromEntries(
										availableModels.map((model) => [model, model])
									)
								)
								.setValue(this.plugin.settings.selectedModel)
								.onChange(async (value) => {
									await this.plugin.updateSettings({
										selectedModel: value as GeminiModel,
									});
								})
						);

						// Add reload button
						modelSetting.addButton((button) =>
							button
								.setIcon('refresh-ccw')
								.setTooltip('Reload available models')
								.onClick(async () => {
									await createModelDropdown();
									new Notice('Models refreshed');
								})
						);

						// Add a note that models were fetched from API
						modelSetting.descEl.createSpan({
							text: ' (Models fetched from Gemini API)',
							cls: 'setting-item-description'
						});
						
						return;
					}
				} catch (error) {
					// If there's an error, fall back to hardcoded models
					console.error('Failed to fetch Gemini models:', error);

					// Add a note about the error
					modelSetting.descEl.createSpan({
						text: ` (Could not fetch models: ${error.message})`,
						cls: 'setting-item-description'
					});
				}
			}

			// Add reload button for fallback case as well
			modelSetting.addButton((button) =>
				button
					.setIcon('refresh-ccw')
					.setTooltip('Reload available models')
					.onClick(async () => {
						await createModelDropdown();
						new Notice('Models refreshed');
					})
			);
		};
		
		// Initial creation of model dropdown
		await createModelDropdown();

		// Setting for Summary Prompt
		new Setting(containerEl)
			.setName('Summary prompt')
			.setDesc('Customize the prompt for generating summaries')
			.addTextArea((text) =>
				text
					.setPlaceholder('Enter custom prompt')
					.setValue(this.plugin.settings.customPrompt)
					.onChange(async (value) => {
						await this.plugin.updateSettings({
							customPrompt: value,
						});
					})
					.then(textArea => {
						// Set width to 50% of container
						textArea.inputEl.style.width = '500px';
						// Set height to accommodate approximately 10 lines
						textArea.inputEl.style.height = '200px';
					})
			);

		// Setting for Max Tokens
		new Setting(containerEl)
			.setName('Max tokens')
			.setDesc('Maximum number of tokens to generate')
			.addText((text) =>
				text
					.setPlaceholder('Enter max tokens')
					.setValue(String(this.plugin.settings.maxTokens))
					.onChange(async (value) => {
						await this.plugin.updateSettings({
							maxTokens: Number(value),
						});
					})
			);

		// Setting for Temperature
		new Setting(containerEl)
			.setName('Temperature')
			.setDesc('Temperature parameter for text generation')
			.addText((text) =>
				text
					.setPlaceholder('Enter temperature')
					.setValue(String(this.plugin.settings.temperature))
					.onChange(async (value) => {
						await this.plugin.updateSettings({
							temperature: Number(value),
						});
					})
			);

		// Button to reset settings
		new Setting(containerEl)
			.setName('Reset settings')
			.setDesc('Reset all settings to default values')
			.addButton((button) =>
				button
					.setButtonText('Reset')
					.setCta()
					.onClick(async () => {
						await this.plugin.updateSettings({
							...DEFAULT_SETTINGS,
						});
						new Notice('Settings reset to default values');
						this.display();
					})
			);
	}
}
