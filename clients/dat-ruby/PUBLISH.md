## sync
```shell
rm -rf Gemfile.lock
bundle install

```

## publish
```
gem build saro-dat.gemspec
gem signin
gem push saro-dat-4.3.4.gem
```

## install
```
# install
brew install rbenv ruby-build

# mac -
echo 'eval "$(rbenv init -)"' >> ~/.zshrc
source ~/.zshrc
# - mac

rbenv install -l
rbenv install 4.0.5
rbenv local 4.0.5
rbenv rehash

ruby -v
```


## install test
```
bundle add saro-dat
bundle install
```
