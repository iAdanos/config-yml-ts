# yaml-config-ts - Simple Yaml Config for Typescript

Inspired by [BitFis/config](https://github.com/BitFis/config)

## Install

```
$ npm install yaml-config-ts --save
```

## Usage
Use config for yaml config files in Typescipt projects.  For example you might have a project with the following
config.yml file in the project dir.

See [example](example) directory to check sample code.

## Substitution
You can substitute variables in the config.yml like this.

```yaml

dns: myapp.com

app:
    url: http://${dns}/home
    cache: redis

db:
    location: mysql-db-prod

```

This config would yield the following.

```javascript

console.log(config.app.url);

// outputs - http://myapp.com/home

```

## Config Folder
Instead of having a file named `config.yml` with all of your environment settings in place, you could have a `config` folder
at the root level of your project. This module will read in every `.yml` file, and return an object that looks like:
```javascript
{
    [file-name]: [parsed-file-contents],
    ...,
}
```

if you need to do cross-file referencing, you can, via dot-notation:
```yaml
# file `a.yml`
foo: bar
```
```yaml
#file `b.yml`
baz: ${a.foo}
```
will get you
```javascript
{
    a: {foo: 'bar'},
    b: {baz: 'bar'}
}
```

## Known issues

- Circular dependencies are not handled
