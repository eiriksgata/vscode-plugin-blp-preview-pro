import MpqArchive from './archive';
import FsPromise from './fspromise';
import Task from '../common/task';
import * as path from "path";

export default class ArchiveManager {
    archives: MpqArchive[] = [];
    task: Task<boolean>;
    isLoading = false;

    constructor() {
        this.task = new Task();
        this.task.resolve(false);
    }

    async load(mpqFilePath: string) {
        if (this.isLoading) {
            await this.task;
            return;
        }
        this.task = new Task<boolean>()
        this.isLoading = true;
        try {
            const stat = await FsPromise.stat(mpqFilePath);
            const root = stat.isDirectory() ? mpqFilePath : path.dirname(mpqFilePath);
            const files = await FsPromise.readDir(root);
            const mpqFiles = files.filter(v => v.toLowerCase().endsWith('.mpq'));
            this.archives = await Promise.all(mpqFiles.map(async file => {
                const archive = new MpqArchive(path.basename(file));
                await archive.load(path.resolve(root, file));
                return archive;
            }));
            this.task.resolve(true);
        } catch (e) {
            this.archives = [];
            this.task.reject(e);
            throw e;
        } finally {
            this.isLoading = false;
        }
    }

    async get(name: string) {
        for (let i = 0; i < this.archives.length; i++) {
            const ret = await this.archives[i].get(name);
            if (ret) { return ret; }
        }
        return null;
    }

    async getAll(name: string) {
        const rets = [];
        for (let i = 0; i < this.archives.length; i++) {
            const ret = await this.archives[i].get(name);
            if (ret) { rets.push(ret); }
        }
        return rets;
    }
}

// const archive = new ArchiveManager();

// archive.load("/mnt/d/Program Files (x86)/dzclient/Game/Warcraft III Frozen Throne/war3.mpq").then(async () => {
//     const buf = await archive.get('replaceabletextures\\teamcolor\\teamcolor00.blp');
//     console.info(buf);
// });