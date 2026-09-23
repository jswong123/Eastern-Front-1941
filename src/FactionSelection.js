export class FactionSelection {

    constructor(gameState) {

        this.gameState = gameState;
        this.overlay = null;

    }


    show(onStart = null) {

        // 防止重复创建阵营选择界面
        this.close();


        this.overlay =
            document.createElement("div");


        Object.assign(
            this.overlay.style,
            {
                position: "fixed",
                left: "0",
                top: "0",
                width: "100%",
                height: "100%",
                background:
                    "rgba(25, 29, 24, 0.96)",
                zIndex: "9999",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily:
                    "FangSong, 仿宋, SimSun, serif"
            }
        );


        const panel =
            document.createElement("div");


        Object.assign(
            panel.style,
            {
                width: "760px",
                maxWidth: "90vw",
                color: "#e8e2c8",
                textAlign: "center"
            }
        );


        panel.innerHTML = `

            <div style="
                font-size:42px;
                margin-bottom:8px;
            ">
                东线 1941
            </div>

            <div style="
                font-size:18px;
                opacity:0.7;
                margin-bottom:36px;
            ">
                杜布诺战役 · 1941年6月26日 08:00
            </div>


            <div style="
                display:flex;
                gap:20px;
                justify-content:center;
                flex-wrap:wrap;
            ">

                ${this.createFactionCard(
                    "GER",
                    "德 军",
                    "第1装甲集群",
                    "向杜布诺—里夫内方向继续突破"
                )}

                ${this.createFactionCard(
                    "USSR",
                    "苏 军",
                    "西南方面军",
                    "组织机械化部队实施反突击"
                )}

            </div>


            <button
                id="observerButton"
                type="button"
                style="
                    margin-top:30px;
                    padding:10px 24px;
                    background:transparent;
                    color:#c9c4ae;
                    border:1px solid #777565;
                    cursor:pointer;
                    font-family:inherit;
                    font-size:15px;
                "
            >
                观察员模式
            </button>


            <div style="
                margin-top:20px;
                font-size:13px;
                opacity:0.55;
            ">
                观察员模式用于开发与战场复盘，
                可查看双方完整信息
            </div>

        `;


        this.overlay.appendChild(panel);

        document.body.appendChild(this.overlay);


        // ============================
        // 阵营按钮
        // ============================

        const factionButtons =
            panel.querySelectorAll(
                "[data-faction]"
            );


        factionButtons.forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const faction =
                            button.dataset.faction;


                        // 设置玩家阵营
                        if (
                            this.gameState &&
                            typeof this.gameState
                                .setPlayerFaction === "function"
                        ) {

                            this.gameState
                                .setPlayerFaction(
                                    faction
                                );

                        } else {

                            console.error(
                                "GameState 缺少 setPlayerFaction()"
                            );

                            return;

                        }


                        this.close();


                        // 启动游戏
                        if (
                            typeof onStart === "function"
                        ) {

                            onStart(faction);

                        }

                    }
                );

            }
        );


        // ============================
        // 观察员模式
        // ============================

        const observerButton =
            panel.querySelector(
                "#observerButton"
            );


        if (observerButton) {

            observerButton.addEventListener(
                "click",
                () => {

                    if (
                        this.gameState &&
                        typeof this.gameState
                            .setObserverMode === "function"
                    ) {

                        this.gameState
                            .setObserverMode();

                    } else {

                        console.error(
                            "GameState 缺少 setObserverMode()"
                        );

                        return;

                    }


                    this.close();


                    if (
                        typeof onStart === "function"
                    ) {

                        onStart("OBSERVER");

                    }

                }
            );

        }

    }


    createFactionCard(
        faction,
        title,
        command,
        mission
    ) {

        const accent =
            faction === "GER"
                ? "#8495a5"
                : "#b75d58";


        return `

            <button
                type="button"
                data-faction="${faction}"
                style="
                    width:300px;
                    min-height:230px;
                    padding:28px;
                    background:#ded8bd;
                    border:3px solid ${accent};
                    cursor:pointer;
                    color:#292b25;
                    font-family:inherit;
                "
            >

                <div style="
                    font-size:30px;
                    margin-bottom:20px;
                ">
                    ${title}
                </div>


                <div style="
                    font-size:19px;
                    margin-bottom:16px;
                ">
                    ${command}
                </div>


                <div style="
                    font-size:14px;
                    line-height:1.7;
                    opacity:0.75;
                ">
                    ${mission}
                </div>


                <div style="
                    margin-top:25px;
                    font-size:16px;
                ">
                    选择阵营
                </div>

            </button>

        `;

    }


    close() {

        if (!this.overlay) {
            return;
        }


        if (this.overlay.parentNode) {

            this.overlay.parentNode
                .removeChild(
                    this.overlay
                );

        }


        this.overlay = null;

    }

}
