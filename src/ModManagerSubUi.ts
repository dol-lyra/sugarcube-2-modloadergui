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
        // All mod lists (both SideLoad/IndexDB and Local with extra boot.json fields) are managed through IndexDB
        const modListEnabled = await this.modLoaderGui.listSideLoadModNameOnly();
        const modListDisable = await this.modLoaderGui.listSideLoadHiddenModNameOnly();
        const modLoadSwitch = this.modLoaderGui.getModLoadSwitch();
        const localAll = modLoadSwitch.listLocalExtraModNameOnly();
        // Add local mods to the enabled list
        const combinedEnabled = Array.from(new Set([...modListEnabled, ...localAll]));
        // Filter out hidden ones
        const finalEnabled = combinedEnabled.filter(n => !modListDisable.includes(n));
        const finalDisabled = modListDisable;
        // console.log('[ModManagerSubUi] whenCreate', [finalEnabled, finalDisabled]);
        Ref.addComponentModGuiConfig({
            selector: 'enable-order-component',
            data: {
                listEnabled: finalEnabled.map(T => {
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
                        // All mod lists are now stored in IndexDB only
                        const enabledNames = (listEnabled.map(T => T.key) as string[]);
                        const disabledNames = (listDisabled.map(T => T.key) as string[]);

                        await this.modLoaderGui.gModUtils.getModLoadController().overwriteModIndexDBModList(enabledNames);
                        await this.modLoaderGui.gModUtils.getModLoadController().overwriteModIndexDBHiddenModList(disabledNames);
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

