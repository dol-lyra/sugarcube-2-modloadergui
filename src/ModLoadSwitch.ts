import type {SC2DataManager} from "../../../dist-BeforeSC2/SC2DataManager";
import type {ModUtils} from "../../../dist-BeforeSC2/Utils";
import type {LifeTimeCircleHook} from "../../../dist-BeforeSC2/ModLoadController";
import type {ModBootJson} from "../../../dist-BeforeSC2/ModLoader";
import type JSZip from "jszip";
import type {Sc2EventTracerCallback} from "../../../dist-BeforeSC2/Sc2EventTracer";
import {isNil} from 'lodash';

class SafeMode implements Sc2EventTracerCallback, LifeTimeCircleHook {
    constructor(
        public gSC2DataManager: SC2DataManager,
        public gModUtils: ModUtils,
    ) {
        this.gSC2DataManager.getModLoadController().addLifeTimeCircleHook('ModLoaderGui SafeMode', this);
        this.gSC2DataManager.getSc2EventTracer().addCallback(this);
        this.needIntoSafeMode();
    }

    public get safeModeAutoOn() {
        return !isNil(localStorage.getItem('ModLoadSwitch_safeModeAutoOn'));
    }

    public get safeModeForceOn() {
        return !isNil(localStorage.getItem('ModLoadSwitch_safeModeForceOn'));
    }

    private set safeModeAutoOn(on: boolean) {
        if (on) {
            localStorage.setItem('ModLoadSwitch_safeModeAutoOn', '1');
        } else {
            localStorage.removeItem('ModLoadSwitch_safeModeAutoOn');
        }
    }

    private set safeModeForceOn(on: boolean) {
        if (on) {
            localStorage.setItem('ModLoadSwitch_safeModeForceOn', '1');
        } else {
            localStorage.removeItem('ModLoadSwitch_safeModeForceOn');
        }
    }

    private get startBeginCount() {
        const n = localStorage.getItem('ModLoadSwitch_startBeginCount');
        return +(n ?? 0);
    }

    private set startBeginCount(n: number) {
        localStorage.setItem('ModLoadSwitch_startBeginCount', `${n}`);
    }

    whenSC2StoryReady() {
        if (!this.safeModeAutoOn) {
            this.startBeginCount = 0;
        }
    }

    private needIntoSafeMode() {
        if (this.startBeginCount >= 3) {
            this.safeModeAutoOn = true;
        }
        ++this.startBeginCount;
    }

    public disableSafeMode() {
        this.safeModeAutoOn = false;
        this.safeModeForceOn = false;
        this.startBeginCount = 0;
    }

    public enableSafeMode() {
        this.safeModeForceOn = true;
    }

    public isSafeModeOn() {
        return this.safeModeForceOn || this.safeModeAutoOn;
    }

    async canLoadThisMod(bootJson: ModBootJson, zip: JSZip): Promise<boolean> {
        console.log('ModLoadSwitch.canLoadThisMod()', [bootJson.name]);
        if (this.isSafeModeOn()) {
            console.log('ModLoadSwitch.canLoadThisMod() safeMode is on');
            if (this.modWhiteList.includes(bootJson.name)) {
                console.log('ModLoadSwitch.canLoadThisMod() mod is in white list, allow load', bootJson.name);
                return true;
            }
            return false;
        }
        return true;
    }

    modWhiteList = [
        'ConflictChecker',
        'ModSubUiAngularJs',
    ];
}

export class ModLoadSwitch implements LifeTimeCircleHook {
    private safeMode: SafeMode;

    // Centralized list of manageable/unremovable mod names
    public static readonly MANAGEABLE_MOD_NAMES = [
        'ModI18N',
        'Cheat-Lyra',
        'CombatStatusDisplay-Lyra',
    ];

    constructor(
        public gSC2DataManager: SC2DataManager,
        public gModUtils: ModUtils,
    ) {
        this.safeMode = new SafeMode(gSC2DataManager, gModUtils);
        this.gSC2DataManager.getModLoadController().addLifeTimeCircleHook('ModLoaderGui ModLoadSwitch', this);
    }

    disableSafeMode() {
        this.safeMode.disableSafeMode();
    }

    enableSafeMode() {
        this.safeMode.enableSafeMode();
    }

    public isSafeModeOn() {
        return this.safeMode.isSafeModeOn();
    }

    public isSafeModeAutoOn() {
        return this.safeMode.safeModeAutoOn;
    }

    async canLoadThisMod(bootJson: ModBootJson, zip: JSZip): Promise<boolean> {
        // Respect SafeMode + user-configured hidden lists for Local/IndexDB mods with extra fields
        if (this.isSafeModeOn()) {
            return false;
        }
        try {
            if (this.isManageableMod(bootJson)) {
                const hiddenIndexDb = await this.gSC2DataManager.getModLoadController().loadHiddenModList() || [];
                if (hiddenIndexDb.includes(bootJson.name)) {
                    console.log('[ModLoaderGui] ModLoadSwitch.canLoadThisMod() banned by hidden list', bootJson.name);
                    return false;
                }
            }
        } catch (e) {
            console.error('[ModLoaderGui] ModLoadSwitch.canLoadThisMod error', e);
        }
        return true;
    }

    // ================== Local mod enable/disable/sort support ==================
    // Determine whether a mod is manageable based on a whitelist of mod names
    private isManageableMod(bootJson: ModBootJson): boolean {
        return ModLoadSwitch.MANAGEABLE_MOD_NAMES.includes(bootJson.name);
    }

    public listLocalExtraModNameOnly(): string[] {
        // Walk all loaded mods, pick those from Local source and with extra fields
        const names = this.gModUtils.getModListNameNoAlias();
        const r: string[] = [];
        for (const n of names) {
            const info = this.gModUtils.getModAndFromInfo(n);
            if (!info) continue;
            if (info.from === 'Local' && this.isManageableMod(info.mod.bootJson)) {
                r.push(info.name);
            }
        }
        return r;
    }

    // Backward alias if future code references a more explicit name
    public listLocalManageableModNameOnly(): string[] {
        return this.listLocalExtraModNameOnly();
    }
}
