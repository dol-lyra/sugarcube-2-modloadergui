import type {
    ModSubUiAngularJsModeExportInterface
} from "../../ModSubUiAngularJs/dist-ts/ModSubUiAngularJsModeExportInterface";
import {ModSubUiAngularJsService} from "./ModSubUiAngularJsService";
import {getStringTable, StringTableType} from "./GUI_StringTable/StringTable";
import {Gui} from "./Gui";


const StringTable: StringTableType = new Proxy({}, {
    get: function (obj, prop: keyof StringTableType) {
        const s = getStringTable();
        return s[prop];
    },
}) as StringTableType;


export class ModManagerSubUi {

    constructor(
        public modSubUiAngularJsService: ModSubUiAngularJsService,
        public modLoaderGui: Gui,
    ) {
        this.modSubUiAngularJsService.addLifeTimeCallback('ModManagerSubUi', {
            whenCreate: this.whenCreate.bind(this),
        });
    }

    async whenCreate(Ref: ModSubUiAngularJsModeExportInterface) {
        // Build combined lists: SideLoad (IndexDB) + Local (with extra boot.json fields)
        const sideEnabled = await this.modLoaderGui.listSideLoadModNameOnly();
        const sideDisabled = await this.modLoaderGui.listSideLoadHiddenModNameOnly();
        const modLoadSwitch = this.modLoaderGui.getModLoadSwitch();
        const localAll = modLoadSwitch.listLocalExtraModNameOnly();
        const localHidden = modLoadSwitch.getLocalHiddenList();
        const localEnabled = localAll.filter(n => !localHidden.includes(n));
        const modListEnabled = Array.from(new Set([...sideEnabled, ...localEnabled]));
        const modListDisable = Array.from(new Set([...sideDisabled, ...localHidden]));
        // console.log('[ModManagerSubUi] whenCreate', [modListEnabled, modListDisable]);
        Ref.addComponentModGuiConfig({
            selector: 'enable-order-component',
            data: {
                listEnabled: modListEnabled.map(T => {
                    return {
                        key: T,
                        str: T,
                        selected: false,
                    };
                }),
                listDisabled: modListDisable.map(T => {
                    return {
                        key: T,
                        str: T,
                        selected: false,
                    };
                }),
                onChange: async (
                    action: any,
                    listEnabled: {
                        key: string | number,
                        str: string,
                        selected: boolean,
                    }[],
                    listDisabled: {
                        key: string | number,
                        str: string,
                        selected: boolean,
                    }[],
                    selectedKeyEnabled: string | number,
                    selectedKeyDisabled: string | number,
                ) => {
                    try {
                        // Split combined lists back to SideLoad and Local buckets
                        const enabledNames = (listEnabled.map(T => T.key) as string[]);
                        const disabledNames = (listDisabled.map(T => T.key) as string[]);
                        const sideAllSet = new Set(await this.modLoaderGui.listSideLoadModNameOnly());
                        const localAllSet = new Set(modLoadSwitch.listLocalExtraModNameOnly());
                        const sideEnabledNew = enabledNames.filter(n => sideAllSet.has(n));
                        const sideHiddenNew = disabledNames.filter(n => sideAllSet.has(n));
                        const localEnabledNew = enabledNames.filter(n => localAllSet.has(n));
                        const localHiddenNew = disabledNames.filter(n => localAllSet.has(n));

                        await this.modLoaderGui.gModUtils.getModLoadController().overwriteModIndexDBModList(sideEnabledNew);
                        await this.modLoaderGui.gModUtils.getModLoadController().overwriteModIndexDBHiddenModList(sideHiddenNew);
                        modLoadSwitch.overwriteLocalOrderList(localEnabledNew);
                        modLoadSwitch.overwriteLocalHiddenList(localHiddenNew);
                    } catch (e) {
                        console.error('[ModLoaderGui] ModManagerSubUi onChange', e);
                    }
                },
                noHrSplit: true,
                buttonClass: 'btn btn-sm btn-secondary',
                text: {
                    MoveEnabledSelectedItemUp: StringTable.MoveEnabledSelectedItemUp,
                    MoveEnabledSelectedItemDown: StringTable.MoveEnabledSelectedItemDown,
                    EnableSelectedItem: StringTable.EnableSelectedItem,
                    DisableSelectedItem: StringTable.DisableSelectedItem,
                    MoveDisabledSelectedItemUp: StringTable.MoveDisabledSelectedItemUp,
                    MoveDisabledSelectedItemDown: StringTable.MoveDisabledSelectedItemDown,
                    title: StringTable.ModEnableGuiTitle,
                },
            },
        });
    }

}

