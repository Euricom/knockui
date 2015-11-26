# KnockUI

KnockUi is a SCSS framework used in euricom projects. Full documentation can be found when serving the demo.

## Get the demo running

### Clone this repo

First of all, start by cloning this repository to your machine.

```
git clone https://github.com/Euricom/knockui.git
```

### Install dependencies

After you've cloned the repo, it is necessary to install the dependencies.

```
npm install && bower install
```

### Setup SCSS linter

Before running the app, you should also install the scsslint ruby gem.

```
sudo gem install scss_lint
```

### Starting the application

Now you're ready to serve the application, run the following command to get things going.

```
gulp
```

## Create a version

Creating a new version of KnockUI can be done by using one of the following gulp tasks.
Each one of these tasks will:
- build the library
- update the version in both bower.json and package.json
- merge the develop branch into the master branch
- create a new tag
- push changes to the remote repository

**note: make sure before creating a version, that all your required changes are merged into the develop branch**

Available tasks:
- `gulp patch`: creates a new patch version (0.0.X)
- `gulp minor`: creates a new minor version (0.X.0)
- `gulp major`: creates a new major version (X.0.0)
