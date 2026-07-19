## reload
```shell
vcpkg install
```

```shell
mkdir -p ~/vcpkg/ports/dat
cp ./portfile.cmake ~/vcpkg/ports/dat/.
cp ./vcpkg.json ~/vcpkg/ports/dat/.

# build
profile.cmake 에서 SHA512 를 0 으로 바꾸고 실행
vcpkg remove dat --classic
# 시간차를 두고 실행한다 파일락
vcpkg install dat --classic

# error: failing download because the expected SHA512 was all zeros, please change the expected SHA512 to: 3d8b7fd4
# 위와 같은 메시지가 뜨면 
# profile.cmake SHA512 에 업데이트
vcpkg remove dat --classic
# 시간차를 두고 실행한다 파일락
vcpkg install dat --classic

# 성공했으면

# 포멧오류 발생시 vcpkg format-manifest .vcpkg-ports/dat/vcpkg.json
vcpkg x-add-version dat --overwrite-version


cd ~/vcpkg

git add ports/dat/ versions/

git commit -m "[dat] Add new port at version 4.3.0"

git push origin master

# 직접가서 
open https://github.com/saro-lab/vcpkg
# pull request 실행

```


## reload vcpkg
```
vcpkg install

# self cert
git config --global http.sslVerify false
# Linux/macOS
export GIT_SSL_NO_VERIFY=true

# Windows (PowerShell)
$env:GIT_SSL_NO_VERIFY="true"
```


## install vcpkg
```
# mac
brew install fmt
brew install cmake

cd ~/
# before synchronous needs to be installed
git clone https://github.com/saro-lab/vcpkg
cd vcpkg
# linux / mac
# ./bootstrap-vcpkg.sh
# window
# ./bootstrap-vcpkg.bat

# linux / mac
echo 'export VCPKG_ROOT="$HOME/vcpkg"' >> ~/.zshrc
echo 'export PATH="$VCPKG_ROOT:$PATH"' >> ~/.zshrc

source ~/.zshrc

# window (power shell)
if (!(Test-Path $PROFILE)) { New-Item -Type File -Path $PROFILE -Force }
Add-Content $PROFILE '  $env:VCPKG_ROOT = "$HOME\vcpkg"'
Add-Content $PROFILE '  $env:PATH = "$env:VCPKG_ROOT;$env:PATH"'
. $PROFILE



# pre (marker test)
mkdir -p ~/vcpkg/ports/dat
```

```
OpenSSL
CMake >= 3.15
```

- 툴체인 확인
```
# 윈도우
Get-ChildItem -Path "$env:USERPROFILE\AppData\Roaming\JetBrains" -Filter "vcpkg.cmake" -Recurse -ErrorAction SilentlyContinue | Select-Object FullName
```

## build test
```shell



mkdir build
cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
# cmake --build build -- -j4
cmake --build . --config Release

./scripts/test.sh 



mkdir build
cd build
cmake .. -DCMAKE_BUILD_TYPE=Debug
# cmake --build build -- -j4
cmake --build . --config Deubg

./scripts/test.sh 
```



# Install
- Linux
```
cd ~/
# before synchronous needs to be installed
git clone https://github.com/saro-lab/vcpkg
cd vcpkg
./bootstrap-vcpkg.sh
```
- Mac
```
brew install fmt
brew install cmake
cd ~/
# before synchronous needs to be installed
git clone https://github.com/saro-lab/vcpkg
cd vcpkg
./bootstrap-vcpkg.sh

echo 'export VCPKG_ROOT="$HOME/vcpkg"' >> ~/.zshrc
echo 'export PATH="$VCPKG_ROOT:$PATH"' >> ~/.zshrc

source ~/.zshrc
```
- Windows (ps)
```
# self cert
# winget settings --enable BypassCertificatePinningForMicrosoftStore

# winget install Git.Git
winget install Kitware.CMake

$env:VCPKG_DOWNLOADS="C:\data\vcpkg"
vcpkg install

```



```

vcpkg install --triplet x64-windows


mkdir -p build
cd build

# 2. CMake 설정 및 빌드
cmake ..
cmake --build .

# 3. CTest 실행!
ctest
```