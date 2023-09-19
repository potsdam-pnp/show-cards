const fs = require("fs").promises;
const { exec } = require('node:child_process');
const path = require("path");

const [owner, repo] = (process.env.GITHUB_REPOSITORY ?? "/").split("/");

async function commentIssue(github, issueNumber, body) {
  if (!github) {
    console.log("No connection to github, would post the following comment");
    console.log("  " + body.split("\n").join("\n  "));
    return;
  }
  await github.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
    owner,
    repo,
    issue_number: issueNumber,
    body: body
  });
  console.log("Posted comment");
}

class Commit {
  constructor(github) {
    this.github = github;
    this.files = [];

    if (!this.github) {
      this.github = {
        request: (url, options) => {
          console.log("Would execute " + url);
          return {data: {0: { object: {} }, tree: {}}};
        } 
      }
    }
  }

  async addFile(path, payload) {
    const result = await this.github.request('POST /repos/{owner}/{repo}/git/blobs', {
      owner,
      repo: 'pf2e-generated-card-images',
      content: payload,
      encoding: 'base64',
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
    console.log(result.data.url);
    this.files.push({
      path: path,
      sha: result.data.sha
    });
  }

  async commit(message) {
    if (this.files.length == 0) return;
    const mainRef = await this.github.request('GET /repos/{owner}/{repo}/git/matching-refs/{ref}', {
      owner,
      repo: 'pf2e-generated-card-images',
      ref: 'heads/main',
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
    const mainCommitSha = mainRef.data[0].object.sha;
    console.log("current head: ", mainRef.data[0].url);

    const mainTree = await this.github.request('GET /repos/{owner}/{repo}/git/commits/{commit_sha}', {
      owner: owner,
      repo: 'pf2e-generated-card-images',
      commit_sha: mainCommitSha,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    const mainTreeSha = mainTree.data.tree.sha;

    const newTree = await this.github.request('POST /repos/{owner}/{repo}/git/trees', {
      owner: owner,
      repo: 'pf2e-generated-card-images',
      base_tree: mainTreeSha,
      tree: this.files.map(file => {
        return {
          path: file.path,
          mode: '100644',
          type: 'blob',
          sha: file.sha
        };
      }),
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
    const newTreeSha = newTree.data.sha;
    const newCommit = await this.github.request('POST /repos/{owner}/{repo}/git/commits', {
      owner,
      repo: 'pf2e-generated-card-images',
      message: message,
      parents: [mainCommitSha],
      tree: newTreeSha,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
    const newCommitSha = newCommit.data.sha;
    await this.github.request('PATCH /repos/{owner}/{repo}/git/refs/{ref}', {
      owner: owner,
      repo: 'pf2e-generated-card-images',
      ref: 'heads/main',
      sha: newCommitSha,
      force: false,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
    console.log("updated main branch to " + newCommitSha);
  }
}

function extractImageOnPage(page, contentPath) {
  return new Promise((resolve, reject) => {
    exec(`pdftoppm -f ${page} -l ${page} -png ${contentPath}/cards.pdf`, { 
      "encoding": "buffer"
    }, (error, stdout, stderr) => {
      if (error) reject(error);
      console.log(stderr.toString("utf8"));
      resolve(stdout.toString("base64"));
    });
  })
}

async function findAndUploadImage(commit, metadataLines, searchString, contentPath) {
  const matchingPages = [];
  let currentPage = 0;
  for (const line of metadataLines) {
    const cardNumber = /^page=(.*)$/.exec(line);
    if (cardNumber) {
      currentPage = cardNumber[1];
    }
    if (line.trim() === searchString) {
      matchingPages.push(currentPage);
    }
  }

  if (matchingPages.length == 0) {
    // Search with regexp instead of equality
    const matchingStrings = [];
    for (const line of metadataLines) {
      if (line.includes(searchString)) {
        matchingStrings.push(line.trim());
      }
    }
    if (matchingStrings.length > 0) {
      const tries = matchingStrings.map(x => "\tshow " + x).join("\n");
      return {
        prefix: `No card found for matching '${searchString}', maybe try one of the following instead?\n\`\`\`\n` + tries + "\n```\n",
        images: ""
      };
    } else {
      return {
        prefix: `No card found matching '${searchString}'\n`,
        images: ""
      };
    }
  }

  console.log(`Found ${matchingPages.length} matching pages`, matchingPages);
  
  const imagePayload = await extractImageOnPage(matchingPages[0], contentPath);
  const fileName = matchingPages[0] + ".png";

  await commit.addFile(process.env.sha + "/" + fileName, imagePayload);

  let prefix = '';
  if (matchingPages.length > 1) {
    prefix = `Found ${matchingPages.length} cards matching '${searchString}', showing only the first one.\n`;
  }
  const path = encodeURIComponent(process.env.sha) + "/" + fileName;
  return {
    prefix: prefix,
    images: '![' + fileName + '](https://raw.githubusercontent.com/potsdam-pnp/pf2e-generated-card-images/main/' + path + ') '
  }
}


async function main(github, issue, contentPath) {
  const metadataLines = (await fs.readFile(path.join(contentPath, "metadata.txt"), "utf-8")).split("\n");
  const searchStrings = issue.body.split("\n").flatMap(line => {
    const index = line.indexOf("/show ");
    if (index == -1) 
      return [];
    else
      return [line.substring(index + "/show ".length).trim()];
  });

  if (searchStrings.length === 0) {
    return;
  }

  let prefix = "";
  let images = "";
  let suffix = "from " + process.env.sha;

  const commit = new Commit(github);

  for (const searchString of searchStrings) {
    const result = await findAndUploadImage(commit, metadataLines, searchString, contentPath);
    prefix += result.prefix;
    images += result.images;
  }

  await commit.commit('upload files for this comment: ' + issue.htmlUrl ?? "<unknown>");

  if (images == "") suffix = "";

  await commentIssue(github, issue.number, prefix + "\n" + images + "\n" + suffix)
}

module.exports = main;