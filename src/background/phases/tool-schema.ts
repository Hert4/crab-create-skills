import type { DetectedTool, ToolOutput, OpenAIToolDef, AnthropicToolDef } from '../../sidepanel/lib/types';

/**
 * Convert DetectedTool[] into three schema formats:
 * - OpenAI tools[] (for GPT-4o and compatible)
 * - Anthropic tools[] (for Claude)
 * - OpenAPI 3.0 YAML string (for MCP / API gateway)
 *
 * This is purely a data transformation — no LLM call needed.
 */
export function generateToolSchemas(tools: DetectedTool[]): ToolOutput {
  return {
    tools,
    openai: toOpenAI(tools),
    anthropic: toAnthropic(tools),
    openapi: toOpenAPI(tools),
  };
}

function toOpenAI(tools: DetectedTool[]): OpenAIToolDef[] {
  return tools.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties: Object.fromEntries(
          tool.parameters.map(p => [
            p.name,
            {
              type: p.type,
              description: p.description,
              ...(p.enum ? { enum: p.enum } : {}),
            },
          ])
        ),
        required: tool.parameters.filter(p => p.required).map(p => p.name),
      },
    },
  }));
}

function toAnthropic(tools: DetectedTool[]): AnthropicToolDef[] {
  return tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: {
      type: 'object',
      properties: Object.fromEntries(
        tool.parameters.map(p => [
          p.name,
          {
            type: p.type,
            description: p.description,
            ...(p.enum ? { enum: p.enum } : {}),
          },
        ])
      ),
      required: tool.parameters.filter(p => p.required).map(p => p.name),
    },
  }));
}

function toOpenAPI(tools: DetectedTool[]): string {
  if (tools.length === 0) {
    return `openapi: "3.0.0"
info:
  title: Agent Tools API
  version: "1.0.0"
paths: {}`;
  }

  const paths: string[] = tools.map(tool => {
    const bodyProps = tool.parameters
      .map(p => {
        const lines = [
          `          ${p.name}:`,
          `            type: ${p.type}`,
          `            description: "${p.description.replace(/"/g, '\\"')}"`,
        ];
        if (p.enum) {
          lines.push(`            enum: [${p.enum.map(v => `"${v}"`).join(', ')}]`);
        }
        return lines.join('\n');
      })
      .join('\n');

    const required = tool.parameters.filter(p => p.required).map(p => `"${p.name}"`);

    return `  /tools/${tool.name}:
    post:
      operationId: ${tool.name}
      summary: "${tool.description.replace(/"/g, '\\"')}"
      description: "${tool.trigger.replace(/"/g, '\\"')}"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
${bodyProps}
              required: [${required.join(', ')}]
      responses:
        "200":
          description: "${tool.returns.replace(/"/g, '\\"')}"
          content:
            application/json:
              schema:
                type: object`;
  });

  return `openapi: "3.0.0"
info:
  title: Agent Tools API
  version: "1.0.0"
paths:
${paths.join('\n')}`;
}
