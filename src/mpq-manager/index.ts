import * as vscode from "vscode";
import * as fs from "fs";
import * as child_process from "child_process";
import * as path from "path";
import ArchiveManager from "./manager";

const REG_PATHS = [
    'HKCU\\Software\\Blizzard Entertainment\\Warcraft III',
    'HKLM\\SOFTWARE\\WOW6432Node\\Blizzard Entertainment\\Warcraft III',
    'HKLM\\SOFTWARE\\Blizzard Entertainment\\Warcraft III',
];

export default class MpqManager {
    private static hasInit = false;
    private static _mpqManager: ArchiveManager;
    private static _ready: Promise<void> = Promise.resolve();

    public static get instance() {
        if (!MpqManager.hasInit) {
            MpqManager.hasInit = true;
            MpqManager.create();
        }
        return MpqManager._mpqManager;
    }

    public static async waitUntilReady() {
        await this._ready;
    }

    public static get archiveNames() {
        return this._mpqManager?.archives?.map(v => v.name) ?? [];
    }

    private static queryInstallPath(regPath: string): Promise<string | null> {
        return new Promise((resolve) => {
            child_process.exec(`reg query "${regPath}" /v "InstallPath"`, (err, stdout) => {
                if (err) {
                    resolve(null);
                    return;
                }
                const match = stdout.match(/InstallPath\s+REG_SZ\s+([^\r\n]+)/);
                resolve(match ? match[1].trim() : null);
            });
        });
    }

    private static async getAutoDetectCandidates() {
        const candidates = new Set<string>();
        for (const regPath of REG_PATHS) {
            const installPath = await this.queryInstallPath(regPath);
            if (!installPath) {
                continue;
            }
            candidates.add(installPath);
            candidates.add(path.join(installPath, 'war3.mpq'));
            candidates.add(path.join(installPath, 'War3.mpq'));
            candidates.add(path.join(installPath, 'war3x.mpq'));
            candidates.add(path.join(installPath, 'War3x.mpq'));
            candidates.add(path.join(installPath, 'war3patch.mpq'));
            candidates.add(path.join(installPath, 'War3Patch.mpq'));
        }

        const defaultRoots = [process.env['ProgramFiles'], process.env['ProgramFiles(x86)']].filter(Boolean);
        for (const root of defaultRoots) {
            const installPath = path.join(root, 'Warcraft III');
            candidates.add(installPath);
            candidates.add(path.join(installPath, 'war3.mpq'));
            candidates.add(path.join(installPath, 'war3x.mpq'));
            candidates.add(path.join(installPath, 'war3patch.mpq'));
        }

        return [...candidates];
    }

    private static async initialize(location?: string) {
        const configured = location?.trim();
        const candidates = configured ? [configured] : await this.getAutoDetectCandidates();
        for (const candidate of candidates) {
            if (!candidate || !fs.existsSync(candidate)) {
                continue;
            }
            try {
                await this._mpqManager.load(candidate);
                return true;
            } catch (e) {
                console.error(e);
            }
        }
        return false;
    }

    public static async reload(location?: string) {
        if (!MpqManager.hasInit) {
            MpqManager.hasInit = true;
            this._mpqManager = new ArchiveManager();
        }
        this._ready = this.initialize(location);
        await this._ready;
        return this.archiveNames.length > 0;
    }

    public static async updateLocation(location: string) {
        const config = vscode.workspace.getConfiguration('blpPreview');
        await config.update('mpqLocation', location, vscode.ConfigurationTarget.Global);
        return this.reload(location);
    }

    private static create() {
        this._mpqManager = new ArchiveManager();
        this._ready = (async () => {
            const data = vscode.workspace.getConfiguration("blpPreview");
            const configured = data?.get<string>('mpqLocation')?.trim();

            const loaded = await this.initialize(configured);
            if (!loaded && configured) {
                vscode.window.showErrorMessage("mpq location is not valid.");
            }
        })();
    }
}
