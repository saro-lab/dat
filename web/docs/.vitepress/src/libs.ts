

export const libList: Library[] = [
    // libraries
    _cargo('dat', '4.3.3', '/libs/cargo-dat'),
    _maven('me.saro:dat', '4.3.5', '/libs/maven-me.saro-dat'),
    _npm('saro-dat', '4.3.3', '/libs/npm-saro-dat', true),
    _pypi('saro-dat', '4.4.1', '/libs/pypi-saro-dat'),
    _nuget('saro-dat', '4.3.2', '/libs/nuget-saro-dat'),
    _go('github.com/saro-lab/dat-go/v4', 'v4.3.2', '/libs/go-saro-dat'),
    _vcpkg('dat', '4.3.0', '/libs/vcpkg-dat', true),
    _ruby('saro-dat', '4.3.3', '/libs/gems-saro-dat'),

    // services
    _docker('sarolab/dat-cms', '4.3.5', '/svc/docker-saro-lab-dat-cms', [
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
    notes: string[],
}

export type LibTag = {
    name: string;
    link: string;
}

export function getAllLibraries(): Library[] {
    return libList.filter(lib => lib.languages.length > 0);
}

export function findLibrary(repository: LibraryRepository, id: string): Library | null {
    return libList.find(lib => lib.repositories.includes(repository) && lib.id === id) || null;
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
            //console.log('no code', repo, id, ver);
        }
    }

    return rv;
}

/**
 * Platform/language tags shown on the landing page, each linking to its library
 * page under the given locale prefix (e.g. `/ko`). Deterministic so it renders
 * identically on the server and the client (no hydration mismatch).
 */
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

export function _cargo(id: string, version: string, link: string, notes: string[] = []): Library {
    return ({
        repositories: ['Cargo'],
        languages: ['Rust'],
        id, version, link, notes
    })
}

export function _maven(id: string, version: string, link: string, notes: string[] = []): Library {
    return ({
        repositories: ['Maven', 'Gradle'],
        languages: ['Java', 'Kotlin'],
        id, version, link, notes
    })
}

export function _ruby(id: string, version: string, link: string, notes: string[] = []): Library {
    return ({
        repositories: ['Gems'],
        languages: ['Ruby'],
        id, version, link, notes
    })
}

export function _npm(id: string, version: string, link: string, supportTypescript: boolean, notes: string[] = []): Library {
    let languages: LibraryLanguage[] = ['JavaScript'];
    if (supportTypescript) {
        languages.push('TypeScript');
    }
    return ({
        repositories: ['Npm', 'Yarn', 'Pnpm'],
        languages,
        id, version, link, notes
    })
}

export function _nuget(id: string, version: string, link: string, notes: string[] = []): Library {
    return ({
        repositories: ['Nuget'],
        languages: ['C#'],
        id, version, link, notes
    })
}

export function _pypi(id: string, version: string, link: string, notes: string[] = []): Library {
    return ({
        repositories: ['Pypi'],
        languages: ['Python'],
        id, version, link, notes
    })
}

export function _docker(id: string, version: string, link: string, notes: string[] = []): Library {
    return ({
        repositories: ['Docker'],
        languages: [],
        id, version, link, notes
    })
}

export function _go(id: string, version: string, link: string, notes: string[] = []): Library {
    return ({
        repositories: ['Go'],
        languages: ['Go'],
        id, version, link, notes
    })
}

export function _vcpkg(id: string, version: string, link: string, supportC: boolean, notes: string[] = []): Library {
    let languages: LibraryLanguage[] = ['C++'];
    if (supportC) {
        languages.push('C');
    }
    return ({
        repositories: ['Vcpkg'],
        languages,
        id, version, link, notes
    })
}