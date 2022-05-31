# Clone build artifact repo

Nuri is not yet (or forever?) released on npm.

Build artifact is stored in https://github.com/dittos/nuri-builds

Clone the repo by running `./clone.sh` (once)

# Build, commit, push

```bash
$ npm run build
$ cd deploy; git add .
$ git diff  # (optional) check difference
$ git commit
$ git push
$ git log -1  # get commit hash
```

Don't forget to commit the original source code!

# Update consumer's `package.json`

```
{
  ...,
  "dependencies": {
    ...,
    "nuri": "github:dittos/nuri-builds#NEW_COMMIT_HASH",
  }
}
```

Then run `npm install`
