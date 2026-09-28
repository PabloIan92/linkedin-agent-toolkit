import { Command } from 'commander';
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
import { DEFAULT_CDP_PORT } from './config.js';

export function runCli(argv) {
  const program = new Command();

  program
    .name('linkedin')
    .description('Zero-credential LinkedIn CLI and automation bridge for developers and AI agents')
    .version('1.0.0');

  // Command: status
  program
    .command('status')
    .description('Check CDP browser connection and LinkedIn authentication status')
    .option('--cdp-url <url>', 'Custom Chrome DevTools Protocol URL')
    .action(async (opts) => {
      console.log('🔍 Checking LinkedIn & Chrome bridge status...');
      const status = await checkStatus(opts);
      console.log(JSON.stringify(status, null, 2));
    });

  // Command: start-browser
  program
    .command('start-browser')
    .description('Launch dedicated Chrome with remote debugging enabled')
    .option('-p, --port <port>', 'Port number to bind CDP to', String(DEFAULT_CDP_PORT))
    .option('-d, --data-dir <dir>', 'Custom user profile directory')
    .action(async (opts) => {
      console.log(`🚀 Launching Chrome on remote debugging port ${opts.port}...`);
      try {
        const res = await launchChrome({
          port: parseInt(opts.port, 10),
          userDataDir: opts.dataDir
        });
        console.log('✅ Chrome launched successfully!');
        console.log(JSON.stringify(res, null, 2));
        console.log('\n👉 If this is your first time, log in to LinkedIn in this Chrome window.');
      } catch (err) {
        console.error('❌ Failed to launch Chrome:', err.message);
        process.exit(1);
      }
    });

  // Profile commands
  const profile = program.command('profile').description('Manage LinkedIn profile information');

  profile
    .command('get')
    .description('Fetch summary of profile')
    .option('--url <url>', 'Specific profile URL')
    .option('--cdp-url <url>', 'Custom CDP URL')
    .action(async (opts) => {
      let browser;
      try {
        console.log('📖 Fetching profile data...');
        const conn = await connectBrowser(opts);
        browser = conn.browser;
        const data = await getProfileSummary(conn.page, opts.url);
        console.log(JSON.stringify(data, null, 2));
      } catch (err) {
        console.error('❌ Error fetching profile:', err.message);
        process.exit(1);
      } finally {
        if (browser) await disconnectBrowser(browser);
      }
    });

  profile
    .command('set-headline <headline>')
    .description('Update profile headline')
    .option('-l, --lang <lang>', 'Target language tab (en or es)', 'en')
    .option('--url <url>', 'Specific profile URL')
    .option('--cdp-url <url>', 'Custom CDP URL')
    .action(async (headline, opts) => {
      let browser;
      try {
        console.log(`✏️ Updating headline (${opts.lang})...`);
        const conn = await connectBrowser(opts);
        browser = conn.browser;
        const res = await updateHeadline(conn.page, {
          headline,
          language: opts.lang,
          profileUrl: opts.url
        });
        console.log('✅ Headline updated successfully:', res);
      } catch (err) {
        console.error('❌ Failed to update headline:', err.message);
        process.exit(1);
      } finally {
        if (browser) await disconnectBrowser(browser);
      }
    });

  profile
    .command('set-about <about>')
    .description('Update profile About / Summary section')
    .option('-l, --lang <lang>', 'Target language tab (en or es)', 'en')
    .option('--url <url>', 'Specific profile URL')
    .option('--cdp-url <url>', 'Custom CDP URL')
    .action(async (about, opts) => {
      let browser;
      try {
        console.log(`✏️ Updating About section (${opts.lang})...`);
        const conn = await connectBrowser(opts);
        browser = conn.browser;
        const res = await updateAbout(conn.page, {
          about,
          language: opts.lang,
          profileUrl: opts.url
        });
        console.log('✅ About updated successfully:', res);
      } catch (err) {
        console.error('❌ Failed to update About:', err.message);
        process.exit(1);
      } finally {
        if (browser) await disconnectBrowser(browser);
      }
    });

  // Project commands
  const project = program.command('project').description('Manage projects section');

  project
    .command('add')
    .description('Add a new project to your profile')
    .requiredOption('-n, --name <name>', 'Project name')
    .option('-d, --desc <description>', 'Project description', '')
    .option('-u, --url <url>', 'Project URL link', '')
    .option('--profile-url <url>', 'Specific profile URL')
    .option('--cdp-url <url>', 'Custom CDP URL')
    .action(async (opts) => {
      let browser;
      try {
        console.log(`📁 Adding project "${opts.name}"...`);
        const conn = await connectBrowser(opts);
        browser = conn.browser;
        const res = await addProject(conn.page, {
          name: opts.name,
          description: opts.desc,
          url: opts.url,
          profileUrl: opts.profileUrl
        });
        console.log('✅ Project added successfully:', res);
      } catch (err) {
        console.error('❌ Failed to add project:', err.message);
        process.exit(1);
      } finally {
        if (browser) await disconnectBrowser(browser);
      }
    });

  // Experience commands
  const experience = program.command('experience').description('Manage experience / work history');

  experience
    .command('add')
    .description('Add a new job position to your profile')
    .requiredOption('-t, --title <title>', 'Job title or role')
    .requiredOption('-c, --company <company>', 'Company name')
    .option('-l, --location <location>', 'Job location', '')
    .option('-d, --desc <description>', 'Job responsibilities and accomplishments', '')
    .option('--profile-url <url>', 'Specific profile URL')
    .option('--cdp-url <url>', 'Custom CDP URL')
    .action(async (opts) => {
      let browser;
      try {
        console.log(`💼 Adding experience: ${opts.title} at ${opts.company}...`);
        const conn = await connectBrowser(opts);
        browser = conn.browser;
        const res = await addExperience(conn.page, {
          title: opts.title,
          companyName: opts.company,
          location: opts.location,
          description: opts.desc,
          profileUrl: opts.profileUrl
        });
        console.log('✅ Experience added successfully:', res);
      } catch (err) {
        console.error('❌ Failed to add experience:', err.message);
        process.exit(1);
      } finally {
        if (browser) await disconnectBrowser(browser);
      }
    });

  // Post command
  program
    .command('post <text>')
    .description('Create or draft a post on your feed')
    .option('--draft', 'Keep post open in editor without publishing', false)
    .option('--cdp-url <url>', 'Custom CDP URL')
    .action(async (text, opts) => {
      let browser;
      try {
        console.log('📢 Processing post...');
        const conn = await connectBrowser(opts);
        browser = conn.browser;
        const res = await createPost(conn.page, {
          text,
          draftOnly: opts.draft
        });
        console.log('✅ Post action finished:', res);
      } catch (err) {
        console.error('❌ Failed to process post:', err.message);
        process.exit(1);
      } finally {
        if (browser) await disconnectBrowser(browser);
      }
    });

  // Screenshot command
  program
    .command('screenshot')
    .description('Take a screenshot of the current active LinkedIn page')
    .option('-o, --output <path>', 'Destination file path for image')
    .option('-f, --full', 'Take full page screenshot', false)
    .option('--cdp-url <url>', 'Custom CDP URL')
    .action(async (opts) => {
      let browser;
      try {
        console.log('📸 Capturing screenshot...');
        const conn = await connectBrowser(opts);
        browser = conn.browser;
        const res = await takeScreenshot(conn.page, {
          outputPath: opts.output,
          fullPage: opts.full
        });
        console.log('✅ Screenshot saved:', res.savedPath);
      } catch (err) {
        console.error('❌ Failed to capture screenshot:', err.message);
        process.exit(1);
      } finally {
        if (browser) await disconnectBrowser(browser);
      }
    });

  program.parse(argv);
}
