import { localeCodes } from '../locales';

const REPO_BASE = 'https://github.com/saro-lab/dat/tree/master';

const DAT_VERSION = '4.7.0';

export const libList: Library[] = [
    _cargo('dat', DAT_VERSION, '/libs/cargo-dat', `${REPO_BASE}/dat-rust`),
    _maven('me.saro:dat', DAT_VERSION, '/libs/maven-me.saro-dat', `${REPO_BASE}/dat-maven`),
    _npm('saro-dat', DAT_VERSION, '/libs/npm-saro-dat', true, `${REPO_BASE}/dat-npm`),
    _pypi('saro-dat', DAT_VERSION, '/libs/pypi-saro-dat', `${REPO_BASE}/dat-pypi`),
    _nuget('saro-dat', DAT_VERSION, '/libs/nuget-saro-dat', `${REPO_BASE}/dat-nuget`),
    _go('github.com/saro-lab/dat/dat-go/v4', `v${DAT_VERSION}`, '/libs/go-saro-dat', `${REPO_BASE}/dat-go`),
    _vcpkg('dat', DAT_VERSION, '/libs/vcpkg-dat', true, `${REPO_BASE}/dat-vcpkg`),
    _ruby('saro-dat', DAT_VERSION, '/libs/gems-saro-dat', `${REPO_BASE}/dat-ruby`),

    _docker('sarolab/dat-cms', DAT_VERSION, '/svc/docker-saro-lab-dat-cms', `${REPO_BASE}/dat-cms`, [
        'arch=amd64',
        'arch=arm64',
        'type=link'
    ]),
];



export type LibraryRepository = 'Cargo' | 'Maven' | 'Npm' | 'Docker' | 'Gradle' | 'Pnpm' | 'Yarn' | 'Nuget' | 'Pypi' | 'Go' | 'Vcpkg' | 'Gems';
export type LibraryLanguage = 'C++' | 'C' | 'Rust' | 'Java' | 'Kotlin' | 'JavaScript' | 'TypeScript' | 'Service' | 'C#' | 'Python' | 'Go' | 'Ruby';

export type Library = {
    repositories: LibraryRepository[];
    languages: LibraryLanguage[];
    id: string;
    version: string;
    link: string;
    repo: string;
    notes: string[],
}

export type LibTag = {
    name: string;
    link: string;
}

export type RegistryLink = {
    name: string;
    url: string;
}

export function getRegistryLinks(library: Library): RegistryLink[] {
    const rv: RegistryLink[] = [];
    const id = library.id;

    for (const repo of library.repositories) {
        switch (repo) {
            case 'Cargo':
                rv.push({name: 'crates.io', url: `https://crates.io/crates/${id}`});
                break;
            case 'Maven':
                rv.push({name: 'Maven Central', url: `https://central.sonatype.com/artifact/${id.split(':')[0]}/${id.split(':')[1]}`});
                break;
            case 'Npm':
                rv.push({name: 'npm', url: `https://www.npmjs.com/package/${id}`});
                break;
            case 'Pypi':
                rv.push({name: 'PyPI', url: `https://pypi.org/project/${id}/`});
                break;
            case 'Nuget':
                rv.push({name: 'NuGet', url: `https://www.nuget.org/packages/${id}`});
                break;
            case 'Go':
                rv.push({name: 'pkg.go.dev', url: `https://pkg.go.dev/${id}`});
                break;
            case 'Gems':
                rv.push({name: 'RubyGems', url: `https://rubygems.org/gems/${id}`});
                break;
            case 'Docker':
                rv.push({name: 'Docker Hub', url: `https://hub.docker.com/r/${id}`});
                break;
        }
    }

    return rv;
}

export function getAllLibraries(): Library[] {
    return libList.filter(lib => lib.languages.length > 0);
}

export function findLibrary(repository: LibraryRepository, id: string): Library | null {
    return libList.find(lib => lib.repositories.includes(repository) && lib.id === id) || null;
}

export function findLibraryByPath(path: string): Library | null {
    const segments = path.replace(/\.md$/, '').split('/').filter(Boolean);
    if (localeCodes.includes(segments[0] as never)) {
        segments.shift();
    }
    return libList.find(lib => lib.link === '/' + segments.join('/')) || null;
}

export function getExtCode(library: Library): ({ext: string, code: string}[]) {
    let rv: ({ext: string, code: string}[]) = [];

    for (let repo of library.repositories) {
        let ext = '';
        let code = '';
        let id = library.id;
        let ver = library.version;

        switch (repo) {
            case 'Cargo':
                ext = 'toml';
                code = `${id} = { version = "${ver}" }`;
                break;
            case 'Maven':
                ext = 'xml';
                code = `<dependency>\n    <groupId>${id.split(':')[0]}</groupId>\n    <artifactId>${id.split(':')[1]}</artifactId>\n    <version>${ver}</version>\n</dependency>`;
                break;
            case 'Gradle':
                ext = 'kts';
                code = `implementation("${id}:${ver}")`;
                break;
            case 'Npm':
                ext = 'bash';
                code = `npm i ${id}@${ver}`;
                break;
            case 'Pnpm':
                ext = 'bash';
                code = `pnpm add ${id}@${ver}`;
                break;
            case 'Yarn':
                ext = 'bash';
                code = `yarn add ${id}@${ver}`;
                break;
            case 'Gems':
                ext = 'bash';
                code = `gem install ${id} --version "~> ${ver}"`;
                break;
            case 'Nuget':
                ext = 'bash';
                code = `# bash\ndotnet add package ${id} --version ${ver}`;
                rv.push({ext, code: code.trim()});
                ext = 'powershell';
                code = `# powershell\nInstall-Package ${id} -Version ${ver}`;
                break;
            case 'Pypi':
                ext = 'bash';
                code = `pip install "${id}~=${ver}"`;
                break;
            case 'Go':
                ext = 'bash';
                code = `go get ${id}@${ver}`;
                break;
            case 'Vcpkg':
                ext = '';
                code = '';
                break;
        }

        if (code) {
            rv.push({ext, code: code.trim()});
        } else {
        }
    }

    return rv;
}

export function getLibTags(localePrefix: string): LibTag[] {
    const tags: LibTag[] = libList.filter(e => e.id != 'sarolab/dat-cms').flatMap(lib => {
        const link = localePrefix + (lib.link.startsWith('/') ? lib.link : `/libs?q=$TAG$`);
        return [...lib.languages, ...lib.repositories].map(tag => ({
            name: tag,
            link: link.replace('$TAG$', tag)
        }));
    });
    const unique = tags.filter((tag, i, arr) => arr.findIndex(t => t.name === tag.name) === i);
    unique.push({name: '...', link: `${localePrefix}/libs`});
    return unique;
}

export function _cargo(id: string, version: string, link: string, repo: string, notes: string[] = []): Library {
    return ({
        repositories: ['Cargo'],
        languages: ['Rust'],
        id, version, link, repo, notes
    })
}

export function _maven(id: string, version: string, link: string, repo: string, notes: string[] = []): Library {
    return ({
        repositories: ['Maven', 'Gradle'],
        languages: ['Java', 'Kotlin'],
        id, version, link, repo, notes
    })
}

export function _ruby(id: string, version: string, link: string, repo: string, notes: string[] = []): Library {
    return ({
        repositories: ['Gems'],
        languages: ['Ruby'],
        id, version, link, repo, notes
    })
}

export function _npm(id: string, version: string, link: string, supportTypescript: boolean, repo: string, notes: string[] = []): Library {
    let languages: LibraryLanguage[] = ['JavaScript'];
    if (supportTypescript) {
        languages.push('TypeScript');
    }
    return ({
        repositories: ['Npm', 'Yarn', 'Pnpm'],
        languages,
        id, version, link, repo, notes
    })
}

export function _nuget(id: string, version: string, link: string, repo: string, notes: string[] = []): Library {
    return ({
        repositories: ['Nuget'],
        languages: ['C#'],
        id, version, link, repo, notes
    })
}

export function _pypi(id: string, version: string, link: string, repo: string, notes: string[] = []): Library {
    return ({
        repositories: ['Pypi'],
        languages: ['Python'],
        id, version, link, repo, notes
    })
}

export function _docker(id: string, version: string, link: string, repo: string, notes: string[] = []): Library {
    return ({
        repositories: ['Docker'],
        languages: [],
        id, version, link, repo, notes
    })
}

export function _go(id: string, version: string, link: string, repo: string, notes: string[] = []): Library {
    return ({
        repositories: ['Go'],
        languages: ['Go'],
        id, version, link, repo, notes
    })
}

export function _vcpkg(id: string, version: string, link: string, supportC: boolean, repo: string, notes: string[] = []): Library {
    let languages: LibraryLanguage[] = ['C++'];
    if (supportC) {
        languages.push('C');
    }
    return ({
        repositories: ['Vcpkg'],
        languages,
        id, version, link, repo, notes
    })
}
