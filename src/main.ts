import { App } from './app';
import { Action } from './action';
import { Github } from './action/github';
import { SPACES_TO_INDENT_JSON } from './json';
import {Logger} from './logging';

const action: Action = new Github();

const logger: Logger = action.getLogger();
const app = new App(action, logger);

app.assertSanityChecksArePassing();

/**
 * Remove the first two arguments from this process.
 *  - first index contains the binary which is used to execute JS (nodejs)
 *  - second argument contains the filename which is being executed
 * After the first two arguments, all remaining arguments should contain filenames from a `diff`. Can be empty in case
 * the action is not run from a pull-request.
 */
/* eslint-disable-next-line no-magic-numbers */
const filesWithChanges: string[] = process.argv.slice(2).filter((value) => value !== '');

const config = app.createConfiguration(filesWithChanges);

logger.debug(`Generated configuration: ${JSON.stringify(config, null, SPACES_TO_INDENT_JSON)}`);
if (filesWithChanges.length > 0) {
    logger.debug('Files used for generating configuration:');
    filesWithChanges.forEach((file) => logger.debug(`   ${ file }`));
}

const checks = app.createJobs(config);

logger.info(`Running code checks: ${config.codeChecks ? 'Yes' : 'No'}`);
logger.info(`Running doc linting: ${config.docLinting ? 'Yes' : 'No'}`);
logger.info(`Versions found: ${JSON.stringify(config.versions)}`);
logger.info(`Using stable PHP version: ${config.stablePhpVersion}`);
logger.info(`Using minimum PHP version: ${config.minimumPhpVersion}`);
logger.info(`Using php extensions: ${JSON.stringify(config.phpExtensions)}`);
logger.info(`Providing php.ini settings: ${JSON.stringify(config.phpIni)}`);
logger.info(`Additional composer arguments: ${JSON.stringify(config.additionalComposerArguments)}`);

for (
    const [ IGNORE_PLATFORM_REQS_PHP_VERSION, IGNORE_PLATFORM_REQS ]
    of Object.entries(config.ignorePhpPlatformRequirements)
) {
    logger.info(`Ignoring php platform requirement for PHP ${IGNORE_PLATFORM_REQS_PHP_VERSION}: ${IGNORE_PLATFORM_REQS ? 'Yes' : 'No'}`);
}

logger.info(`Matrix: ${JSON.stringify(checks, null, SPACES_TO_INDENT_JSON)}`);
action.publish('matrix', ({
    include : checks.map((job) => ({
        name            : job.name,
        operatingSystem : job.operatingSystem,
        action          : job.action,
        job             : JSON.stringify(job.job)
    }))
}));
