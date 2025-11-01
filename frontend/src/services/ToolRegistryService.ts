/**
 * ToolRegistryService - Centralized service for managing tool components and their metadata
 *
 * This service handles:
 * - Dynamic tool registration
 * - Response-to-component mapping
 * - Tool metadata management
 * - Standardized tool interfaces
 */

import React from 'react';

export interface ToolMetadata {
  name: string;
  description?: string;
  category?: string;
  version?: string;
  author?: string;
  tags?: string[];
  icon?: React.ComponentType<any>;
  dependencies?: string[];
}

export interface ToolConfig {
  name: string;
  component: React.ComponentType<any>;
  responseParser?: (response: any) => any;
  errorHandler?: (error: Error) => void;
  metadata?: ToolMetadata;
  enabled?: boolean;
}

export interface ToolRegistration {
  config: ToolConfig;
  registeredAt: Date;
  usageCount: number;
  lastUsed?: Date;
}

export interface ToolRegistry {
  registerTool(toolConfig: ToolConfig): void;
  unregisterTool(toolName: string): void;
  getToolComponent(toolName: string): React.ComponentType<any> | null;
  getToolConfig(toolName: string): ToolConfig | null;
  getAllTools(): ToolRegistration[];
  getEnabledTools(): ToolRegistration[];
  getToolsByCategory(category: string): ToolRegistration[];
  getToolMetadata(toolName: string): ToolMetadata | null;
  enableTool(toolName: string): void;
  disableTool(toolName: string): void;
  isToolEnabled(toolName: string): boolean;
  updateToolConfig(toolName: string, updates: Partial<ToolConfig>): void;
  searchTools(query: string): ToolRegistration[];
  clearRegistry(): void;
}

/**
 * ToolRegistryService class
 */
export class ToolRegistryService implements ToolRegistry {
  private tools: Map<string, ToolRegistration> = new Map();
  private eventListeners: Map<string, Set<Function>> = new Map();

  constructor() {
    this.initializeEventSystem();
  }

  /**
   * Register a new tool with the registry
   */
  registerTool(toolConfig: ToolConfig): void {
    if (!toolConfig.name || !toolConfig.component) {
      throw new Error('Tool registration requires both name and component');
    }

    const registration: ToolRegistration = {
      config: { ...toolConfig, enabled: toolConfig.enabled ?? true },
      registeredAt: new Date(),
      usageCount: 0
    };

    this.tools.set(toolConfig.name, registration);
    this.emit('tool:registered', { toolName: toolConfig.name, registration });

    console.log(`[ToolRegistry] Registered tool: ${toolConfig.name}`);
  }

  /**
   * Unregister a tool from the registry
   */
  unregisterTool(toolName: string): void {
    if (this.tools.has(toolName)) {
      this.tools.delete(toolName);
      this.emit('tool:unregistered', { toolName });
      console.log(`[ToolRegistry] Unregistered tool: ${toolName}`);
    }
  }

  /**
   * Get a tool component by name
   */
  getToolComponent(toolName: string): React.ComponentType<any> | null {
    const registration = this.tools.get(toolName);
    return registration?.config.component || null;
  }

  /**
   * Get tool configuration by name
   */
  getToolConfig(toolName: string): ToolConfig | null {
    const registration = this.tools.get(toolName);
    return registration ? { ...registration.config } : null;
  }

  /**
   * Get all registered tools
   */
  getAllTools(): ToolRegistration[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get only enabled tools
   */
  getEnabledTools(): ToolRegistration[] {
    return this.getAllTools().filter(reg => reg.config.enabled !== false);
  }

  /**
   * Get tools by category
   */
  getToolsByCategory(category: string): ToolRegistration[] {
    return this.getAllTools().filter(reg =>
      reg.config.metadata?.category === category && reg.config.enabled !== false
    );
  }

  /**
   * Get tool metadata
   */
  getToolMetadata(toolName: string): ToolMetadata | null {
    const registration = this.tools.get(toolName);
    return registration?.config.metadata || null;
  }

  /**
   * Enable a tool
   */
  enableTool(toolName: string): void {
    const registration = this.tools.get(toolName);
    if (registration) {
      registration.config.enabled = true;
      this.emit('tool:enabled', { toolName });
    }
  }

  /**
   * Disable a tool
   */
  disableTool(toolName: string): void {
    const registration = this.tools.get(toolName);
    if (registration) {
      registration.config.enabled = false;
      this.emit('tool:disabled', { toolName });
    }
  }

  /**
   * Check if a tool is enabled
   */
  isToolEnabled(toolName: string): boolean {
    const registration = this.tools.get(toolName);
    return registration?.config.enabled !== false;
  }

  /**
   * Update tool configuration
   */
  updateToolConfig(toolName: string, updates: Partial<ToolConfig>): void {
    const registration = this.tools.get(toolName);
    if (registration) {
      registration.config = { ...registration.config, ...updates };
      this.emit('tool:updated', { toolName, updates });
    }
  }

  /**
   * Search tools by query
   */
  searchTools(query: string): ToolRegistration[] {
    const lowercaseQuery = query.toLowerCase();
    return this.getAllTools().filter(reg => {
      const tool = reg.config;
      return (
        tool.name.toLowerCase().includes(lowercaseQuery) ||
        tool.metadata?.description?.toLowerCase().includes(lowercaseQuery) ||
        tool.metadata?.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery)) ||
        tool.metadata?.category?.toLowerCase().includes(lowercaseQuery)
      ) && tool.enabled !== false;
    });
  }

  /**
   * Clear all tools from registry
   */
  clearRegistry(): void {
    this.tools.clear();
    this.emit('registry:cleared', {});
  }

  /**
   * Record tool usage
   */
  recordToolUsage(toolName: string): void {
    const registration = this.tools.get(toolName);
    if (registration) {
      registration.usageCount++;
      registration.lastUsed = new Date();
      this.emit('tool:used', { toolName, registration });
    }
  }

  /**
   * Get tool usage statistics
   */
  getToolStats(toolName: string): {
    usageCount: number;
    lastUsed?: Date;
    registeredAt: Date;
  } | null {
    const registration = this.tools.get(toolName);
    if (!registration) return null;

    return {
      usageCount: registration.usageCount,
      lastUsed: registration.lastUsed,
      registeredAt: registration.registeredAt
    };
  }

  /**
   * Get all tool categories
   */
  getCategories(): string[] {
    const categories = new Set<string>();
    this.getAllTools().forEach(reg => {
      if (reg.config.metadata?.category) {
        categories.add(reg.config.metadata.category);
      }
    });
    return Array.from(categories).sort();
  }

  /**
   * Export registry data
   */
  exportRegistry(): Array<{
    name: string;
    metadata?: ToolMetadata;
    usageCount: number;
    lastUsed?: Date;
    registeredAt: Date;
    enabled: boolean;
  }> {
    return this.getAllTools().map(reg => ({
      name: reg.config.name,
      metadata: reg.config.metadata,
      usageCount: reg.usageCount,
      lastUsed: reg.lastUsed,
      registeredAt: reg.registeredAt,
      enabled: reg.config.enabled !== false
    }));
  }

  // Event system methods

  /**
   * Initialize event system
   */
  private initializeEventSystem(): void {
    this.eventListeners = new Map();
  }

  /**
   * Add event listener
   */
  on(event: string, listener: Function): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    const listeners = this.eventListeners.get(event)!;
    listeners.add(listener);

    // Return unsubscribe function
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.eventListeners.delete(event);
      }
    };
  }

  /**
   * Emit event to listeners
   */
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`[ToolRegistry] Error in event listener for ${event}:`, error);
        }
      });
    }
  }
}

/**
 * Create a default instance of the tool registry service
 */
export const defaultToolRegistry = new ToolRegistryService();

/**
 * Utility functions for common tool registry operations
 */
export const toolRegistryUtils = {
  /**
   * Register multiple tools at once
   */
  registerTools(toolConfigs: ToolConfig[], registry: ToolRegistry = defaultToolRegistry): void {
    toolConfigs.forEach(config => {
      try {
        registry.registerTool(config);
      } catch (error) {
        console.error(`[ToolRegistry] Failed to register tool ${config.name}:`, error);
      }
    });
  },

  /**
   * Create a tool configuration with sensible defaults
   */
  createToolConfig(
    name: string,
    component: React.ComponentType<any>,
    options: Partial<ToolConfig> = {}
  ): ToolConfig {
    return {
      name,
      component,
      enabled: true,
      ...options
    };
  },

  /**
   * Validate tool configuration
   */
  validateToolConfig(config: ToolConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.name || typeof config.name !== 'string') {
      errors.push('Tool name is required and must be a string');
    }

    if (!config.component) {
      errors.push('Tool component is required');
    }

    if (config.metadata) {
      if (config.metadata.name && config.metadata.name !== config.name) {
        errors.push('Metadata name should match tool name');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
};