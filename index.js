#!/usr/bin/env node

const program = require('commander');
const nlf = require('nlf');
const path = require('path');
const fs = require('fs');

function appender(xs) {
    xs = xs || [];
    return function(x) {
        xs.push(x);
        return xs;
    }
}

program
    .name('lcdoc')
    .version('0.0.1')
    .option('-o, --out <path>', 'write the data to a specific file.')
    .option('-i, --ignore <pattern>', 'write the path to ignore.', appender(), [])
    .option('-d, --depth <number>', 'how deep to traverse packages where 0 is the current package.json only');

program
    .command('make [path]')
    .action(function(argv) {
        const ignorePaths = program.ignore;
        let result = [];
        let workingPath = argv || process.cwd();
        const option = {
            directory: workingPath,
        };
        let depth = program.depth;
        if(depth) {
            option.depth = Number(depth);
        }
        nlf.find(option, function(err, items = []) {
            items.forEach((item) => {
                let textList = [];
                if (item.id) {
                    textList.push(`Package: ${item.id}`);
                }
                const licenseSources = item.licenseSources;
                if (licenseSources && licenseSources.license) {
                    const package = licenseSources.package || {};
                    const license = licenseSources.license;
                    const pSource = package.sources || [];
                    const lSource = license.sources || [];

                    let licenseUrl = '';

                    pSource.forEach((p) => {
                        textList.push(`License: ${p.license}`);
                        if (p.url) {
                            textList.push(`License Url: ${p.url}`);
                        }
                    });

                    lSource.forEach((l) => {
                        if(ignorePaths && ignorePaths.some((i)=> {
                            var a = path.resolve(workingPath, i);
                            if(l.filePath.indexOf(a) > -1) {
                                return true;
                            }
                        })) {
                            return;
                        }

                        if (l.filePath) {
                            const parser = path.parse(l.filePath);
                            textList.push(`License Source: ${parser.base}`);
                        }
                        if (l.text) {
                            textList.push(`Source Text:\n\n${l.text}`);
                        }
                    });
                }
                result.push(textList.join('\n'));
            });

            const outputPath = program.out;
            const outputText = result.join('\n\n-------------------------------------------------------------------------\n\n');
            if (outputPath) {
                fs.writeFile(outputPath, outputText, 'utf8', (err) => {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log(`Successfully created file '${outputPath}'.`);
                    }
                });
            } else {
                console.log(outputText);
            }
        });
    });

program.parse(process.argv);
