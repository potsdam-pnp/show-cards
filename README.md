# show-cards

This repository consists of an action to preview images of generated cards in issues.
It is used by the [pf2e-cards] repository and can be triggered there by posting a comment with "/show" content

# Testing locally

This project uses [nix] to create reproducible build targets. Some parts of the action can be tested locally, without
access to a github token.

You need to have some build results from the [pf2e-cards] project, which you can get by doing the following

```
nix build github:potsdam-pnp/pf2e-cards
```

This will create a directory `result`, which contains a `cards.pdf` and a `metadata.txt`. With these, you can use the following
command inside a `show-cards` checkout.

```
# Make some artificial comment body 
export BODY="/show title=Heal"
# Execute a restricted version of the action
nix run . <path to result directory>
```

This may result in the following output:
```
Processing comment { body: '/show title=Heal', htmlUrl: 'unknown', number: '-1' }
Found 10 matching pages [
  '104', '105', '106',
  '107', '108', '109',
  '110', '111', '112',
  '113'
]

Would execute POST /repos/{owner}/{repo}/git/blobs
undefined
Would execute GET /repos/{owner}/{repo}/git/matching-refs/{ref}
current head:  undefined
Would execute GET /repos/{owner}/{repo}/git/commits/{commit_sha}
Would execute POST /repos/{owner}/{repo}/git/trees
Would execute POST /repos/{owner}/{repo}/git/commits
Would execute PATCH /repos/{owner}/{repo}/git/refs/{ref}
updated main branch to undefined
No connection to github, would post the following comment
  Found 10 cards matching 'title=Heal', showing only the first one.
  
  ![104.png](https://raw.githubusercontent.com/potsdam-pnp/pf2e-generated-card-images/main/undefined/104.png) 
  from undefined
```

[pf2e-cards]: https://github.com/potsdam-pnp/pf2e-cards
