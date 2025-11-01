/**
 * ToolRegistryService - Minimal service for managing tool components
 *
 * This service handles:
 * - Tool registration
 * - Component retrieval
 */

import React from "react";

export interface ToolConfig {
  name: string;
  component: React.ComponentType<any>;
}

export interface ToolRegistry {
  registerTool(toolConfig: ToolConfig): void;
  getToolComponent(toolName: string): React.ComponentType<any> | null;
  recordToolUsage(toolName: string): void;
}

/**
 * ToolRegistryService class - Minimal implementation
 */
export class ToolRegistryService implements ToolRegistry {
  private tools: Map<string, ToolConfig> = new Map();

  /**
   * Register a new tool with the registry
   */
  registerTool(toolConfig: ToolConfig): void {
    if (!toolConfig.name || !toolConfig.component) {
      throw new Error("Tool registration requires both name and component");
    }

    this.tools.set(toolConfig.name, toolConfig);
  }

  /**
   * Get a tool component by name
   */
  getToolComponent(toolName: string): React.ComponentType<any> | null {
    const tool = this.tools.get(toolName);
    return tool?.component || null;
  }

  /**
   * Record tool usage (simplified - just logs)
   */
  recordToolUsage(toolName: string): void {
    console.log(`[ToolRegistry] Tool used: ${toolName}`);
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
  registerTools(
    toolConfigs: ToolConfig[],
    registry: ToolRegistry = defaultToolRegistry
  ): void {
    toolConfigs.forEach((config) => {
      try {
        registry.registerTool(config);
      } catch (error) {
        console.error(
          `[ToolRegistry] Failed to register tool ${config.name}:`,
          error
        );
      }
    });
  },

  /**
   * Create a tool configuration
   */
  createToolConfig(
    name: string,
    component: React.ComponentType<any>
  ): ToolConfig {
    return {
      name,
      component
    };
  }
};
