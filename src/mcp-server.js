import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';

import {
  connectBrowser,
  disconnectBrowser,
  launchChrome,
  checkStatus
} from './browser.js';

import {
  getProfileSummary,
  updateHeadline,
  updateAbout
} from './actions/profile.js';

import { addProject } from './actions/projects.js';
import { addExperience } from './actions/experience.js';
import { createPost } from './actions/posts.js';
import { takeScreenshot } from './actions/screenshot.js';

export function createMcpServer() {
  const server = new Server(
    {
      name: 'linkedin-agent-toolkit',
      version: '1.0.0'
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  // List all available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'linkedin_status',
          description: 'Checks whether Chrome CDP is reachable and whether LinkedIn session is authenticated.',
          inputSchema: {
            type: 'object',
            properties: {
              cdpUrl: {
                type: 'string',
                description: 'Optional CDP URL (defaults to http://127.0.0.1:9222).'
              }
            }
          }
        },
        {
          name: 'linkedin_launch_browser',
          description: 'Launches a dedicated Chrome instance with remote debugging enabled (--remote-debugging-port) and an isolated profile.',
          inputSchema: {
            type: 'object',
            properties: {
              port: {
                type: 'number',
                description: 'CDP port to bind (default: 9222).'
              },
              userDataDir: {
                type: 'string',
                description: 'Custom path for isolated profile directory.'
              }
            }
          }
        },
        {
          name: 'linkedin_get_profile',
          description: 'Extracts the user profile information: headline, about, current experience, and projects.',
          inputSchema: {
            type: 'object',
            properties: {
              profileUrl: {
                type: 'string',
                description: 'Optional specific profile URL (e.g. https://www.linkedin.com/in/username/). If omitted, navigates to /in/me/.'
              }
            }
          }
        },
        {
          name: 'linkedin_update_headline',
          description: 'Updates the headline of the LinkedIn profile. Supports switching between English and Spanish tabs.',
          inputSchema: {
            type: 'object',
            properties: {
              headline: {
                type: 'string',
                description: 'The new headline text.'
              },
              language: {
                type: 'string',
                enum: ['en', 'es'],
                description: 'Profile language tab to target (en for English, es for Spanish).'
              },
              profileUrl: {
                type: 'string',
                description: 'Optional profile URL.'
              }
            },
            required: ['headline']
          }
        },
        {
          name: 'linkedin_update_about',
          description: 'Updates the About / Summary section of the LinkedIn profile.',
          inputSchema: {
            type: 'object',
            properties: {
              about: {
                type: 'string',
                description: 'The new About / summary text.'
              },
              language: {
                type: 'string',
                enum: ['en', 'es'],
                description: 'Language tab to target (en for English, es for Spanish).'
              },
              profileUrl: {
                type: 'string',
                description: 'Optional profile URL.'
              }
            },
            required: ['about']
          }
        },
        {
          name: 'linkedin_add_project',
          description: 'Adds a project to the profile with title, description, and optional project URL.',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'The project title or name.'
              },
              description: {
                type: 'string',
                description: 'Detailed description of the project, technologies used, and outcomes.'
              },
              url: {
                type: 'string',
                description: 'Optional URL link to the project repository or live site.'
              },
              profileUrl: {
                type: 'string',
                description: 'Optional profile URL.'
              }
            },
            required: ['name']
          }
        },
        {
          name: 'linkedin_add_experience',
          description: 'Adds a job position / work experience to the profile.',
          inputSchema: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'Job role or title (e.g. Automation Developer).'
              },
              companyName: {
                type: 'string',
                description: 'Company or organization name.'
              },
              location: {
                type: 'string',
                description: 'Optional job location (e.g. Remote, Buenos Aires).'
              },
              description: {
                type: 'string',
                description: 'Responsibilities, achievements, and tech stack.'
              },
              profileUrl: {
                type: 'string',
                description: 'Optional profile URL.'
              }
            },
            required: ['title', 'companyName']
          }
        },
        {
          name: 'linkedin_create_post',
          description: 'Drafts or publishes a status update / post to the LinkedIn feed.',
          inputSchema: {
            type: 'object',
            properties: {
              text: {
                type: 'string',
                description: 'The text content of the post.'
              },
              draftOnly: {
                type: 'boolean',
                description: 'If true, types the post into the editor but does NOT press Post, allowing human review.'
              }
            },
            required: ['text']
          }
        },
        {
          name: 'linkedin_screenshot',
          description: 'Captures a screenshot of the current page for agent visual verification and debugging.',
          inputSchema: {
            type: 'object',
            properties: {
              outputPath: {
                type: 'string',
                description: 'Optional file path to save the screenshot.'
              },
              fullPage: {
                type: 'boolean',
                description: 'Whether to take a full page screenshot.'
              }
            }
          }
        }
      ]
    };
  });

  // Handle tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    // Standalone launcher does not require prior browser connection
    if (name === 'linkedin_launch_browser') {
      try {
        const result = await launchChrome(args);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (err) {
        throw new McpError(ErrorCode.InternalError, `Launch failed: ${err.message}`);
      }
    }

    if (name === 'linkedin_status') {
      try {
        const status = await checkStatus(args);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(status, null, 2)
            }
          ]
        };
      } catch (err) {
        throw new McpError(ErrorCode.InternalError, `Status check failed: ${err.message}`);
      }
    }

    // All other tools connect to browser via CDP
    let browser = null;
    try {
      const conn = await connectBrowser({ cdpUrl: args.cdpUrl });
      browser = conn.browser;
      const page = conn.page;

      let result = null;

      switch (name) {
        case 'linkedin_get_profile':
          result = await getProfileSummary(page, args.profileUrl);
          break;

        case 'linkedin_update_headline':
          result = await updateHeadline(page, {
            headline: args.headline,
            language: args.language,
            profileUrl: args.profileUrl
          });
          break;

        case 'linkedin_update_about':
          result = await updateAbout(page, {
            about: args.about,
            language: args.language,
            profileUrl: args.profileUrl
          });
          break;

        case 'linkedin_add_project':
          result = await addProject(page, {
            name: args.name,
            description: args.description,
            url: args.url,
            profileUrl: args.profileUrl
          });
          break;

        case 'linkedin_add_experience':
          result = await addExperience(page, {
            title: args.title,
            companyName: args.companyName,
            location: args.location,
            description: args.description,
            profileUrl: args.profileUrl
          });
          break;

        case 'linkedin_create_post':
          result = await createPost(page, {
            text: args.text,
            draftOnly: args.draftOnly
          });
          break;

        case 'linkedin_screenshot':
          result = await takeScreenshot(page, {
            outputPath: args.outputPath,
            fullPage: args.fullPage
          });
          break;

        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }

      await disconnectBrowser(browser);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (err) {
      if (browser) await disconnectBrowser(browser);
      throw new McpError(ErrorCode.InternalError, `Execution error: ${err.message}`);
    }
  });

  return server;
}

export async function runMcpServer() {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('LinkedIn Agent Toolkit MCP Server running on stdio');
}
