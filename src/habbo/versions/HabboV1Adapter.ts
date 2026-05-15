import { BaseHabboVersionAdapter } from "./BaseHabboVersionAdapter";
import { earlyLoader, sharedUnsupported, textProtocol } from "./common";

export class HabboV1Adapter extends BaseHabboVersionAdapter {
  constructor() {
    super({
      id: "release1",
      label: "Habbo v1 / release1",
      releaseBand: "2001 Shockwave client",
      accentColor: "#61a0af",
      sourceEvidence: [
        "Quackster/habbo_src release1",
        "Quackster/Roseau Roseau-Server text LOGIN path"
      ],
      loader: earlyLoader("release1 entry movie"),
      protocol: textProtocol("Roseau NetworkDecoder and LOGIN handler", ["LOGIN", "REGISTER", "UPDATE", "INFORETRIEVE", "VERSIONCHECK"], {
        defaultWebSocketPort: 12320,
        upstreamTcpPort: 37120,
        upstreamTcpHost: "127.0.0.1",
        source: "src/Roseau-master/Roseau-master/roseau.properties server.port=37120; browser runtime uses tools/dev/roseau-ws-bridge.mjs as the local WebSocket-to-TCP bridge"
      }),
      featureFlags: {
        textProtocol: true,
        ssoTicket: false,
        musCamera: false
      },
      unsupported: [...sharedUnsupported, "exact v1 loader movie and external cast map pending original file extraction"]
    });
  }
}
