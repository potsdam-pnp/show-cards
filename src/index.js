const showCardInIssue = require("./show-card-in-issue");
const { Octokit } = require("octokit");
const { createAppAuth } = require("@octokit/auth-app");


async function main() {
  let github;
  
  const issue = {
    body: process.env.BODY ?? "",
    htmlUrl: process.env.HTML_URL ?? "unknown",
    number: process.env.ISSUE_NUMBER ?? "-1"
  };

  console.log("Processing comment", issue);

  if (process.env.APPID && process.env.PRIVATEKEY) {
    const [owner, _repo] = (process.env.GITHUB_REPOSITORY ?? "/").split("/");

    const appOctokit = new Octokit({
      "authStrategy": createAppAuth,
      "auth": {
        appId: process.env.APPID,
        privateKey: process.env.PRIVATEKEY
      }
    });

    const installation = await appOctokit.request('GET /orgs/{org}/installation', {
      org: owner,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    console.log("Targeting installation", installation.data.id);

    github = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: process.env.APPID,
        privateKey: process.env.PRIVATEKEY,
        installationId: installation.data.id
      }
    });
  }

  await showCardInIssue(github, issue, process.argv[2]);
}

main();