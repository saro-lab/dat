- publish
```
dotnet clean -c Release
dotnet restore
dotnet build -c Release
dotnet pack -c Release

# The package version comes from <Version> in Saro.Dat/Saro.Dat.csproj -- glob it
# rather than typing it, so a version bump can never push the previous package.
dotnet nuget push bin/Release/saro-dat.*.nupkg -s nuget.org -k [API_KEY]
```
