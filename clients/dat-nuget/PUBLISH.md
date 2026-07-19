- publish
```
dotnet clean -c Release
dotnet restore
dotnet build -c Release
dotnet pack -c Release

dotnet nuget push bin/Release/saro-dat.4.3.2.nupkg -s nuget.org -k [API_KEY]
```
