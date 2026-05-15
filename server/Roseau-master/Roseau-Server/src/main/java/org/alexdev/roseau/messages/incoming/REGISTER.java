package org.alexdev.roseau.messages.incoming;

import java.util.HashMap;
import java.util.Map;

import org.alexdev.roseau.Roseau;
import org.alexdev.roseau.game.GameVariables;
import org.alexdev.roseau.game.player.Player;
import org.alexdev.roseau.log.Log;
import org.alexdev.roseau.messages.MessageEvent;
import org.alexdev.roseau.server.messages.ClientMessage;
import org.alexdev.roseau.util.Util;

public class REGISTER implements MessageEvent {

    @Override
    public void handle(Player player, ClientMessage reader) {
        /*[04/02/2017 00:15:13] [ROSEAU] >> [1924177861] Received: REGISTER / name=ssws
password=123
email=wdwddw@Cc.com
figure=sd=001/0&hr=001/255,255,255&hd=002/255,204,153&ey=001/0&fc=001/255,204,153&bd=001/255,204,153&lh=001/255,204,153&rh=001/255,204,153&ch=001/232,177,55&ls=001/232,177,55&rs=001/232,177,55&lg=001/119,159,187&sh=001/175,220,223
directMail=0
birthday=08.08.1997
phonenumber=+44
customData=dwdwd
has_read_agreement=1
sex=Male
country=*/

        Map<String, String> fields = parseRegisterFields(reader.getMessageBody());
        String name = fields.getOrDefault("name", "");
        String password = fields.getOrDefault("password", "");
        String email = fields.getOrDefault("email", "");
        String figure = FigureString.normalize(fields.getOrDefault("figure", ""));
        String birthday = fields.getOrDefault("birthday", "");
        String mission = Util.filterInput(fields.getOrDefault("customData", ""));
        String sex = fields.getOrDefault("sex", "");

        if (name.length() < 3) {
            Log.println("Invalid name: " + name);
            return;
        }

        if (name.length() > 50) {
            name = name.substring(0, 50);
            return;
        }

        if (password.length() < 3) {
            Log.println("Invalid password: " + password);
            return;
        }

        if (figure.length() < 3) {
            Log.println("Invalid figure: " + figure);
            return;
        }

        if (email.length() > 256) {
            email = email.substring(0, 256);
        }

        if (mission.length() > 100) {
            mission = mission.substring(0, 100);
        }

        if (sex.length() < 4) {
            return;
        }

        if (sex.length() > 6) {
            return;
        }

        if (!approveName(name)) {
            Log.println("Name not approved: " + name);
            return;
        }

        if (Roseau.getDao().getPlayer().isNameTaken(name)) {
            Log.println("Name taken: " + name);
            return;
        }

        Roseau.getDao().getPlayer().createPlayer(name, password, email, mission, figure, -1, sex, birthday);
    }

    private Map<String, String> parseRegisterFields(String body) {
        Map<String, String> fields = new HashMap<String, String>();
        String[] lines = body.split(Character.toString((char)13));

        for (String line : lines) {
            int separator = line.indexOf("=");

            if (separator <= 0) {
                continue;
            }

            String key = line.substring(0, separator);
            String value = line.substring(separator + 1);
            fields.put(key, value);
        }

        return fields;
    }

    public static boolean approveName(String name)
    {
        // FAILproof!
        if (name != null) {

            // Atleast 3 characters and not more than 20?
            if (name.length() >= 3 && name.length() <= 20) {
                // Does username start with MOD- ?
                if (name.indexOf("MOD-") != 0) {

                    // We don't want m0d neither...
                    if (name.indexOf("M0D-") != 0)
                    {
                        // Check for characters
                        String allowed = GameVariables.USERNAME_CHARS;

                        if (allowed.equals("*")) {

                            // Any name can pass!
                            return true;
                        } else {

                            // Check each character in the name
                            char[] nameChars = name.toCharArray();

                            for (int i = 0; i < nameChars.length; i++) {

                                // Is this character allowed?
                                if (allowed.indexOf(Character.toLowerCase(nameChars[i])) == -1) {
                                    // Not allowed
                                    return false;
                                }
                            }

                            // Passed all checks!
                            return true;
                        }
                    }
                }
            }
        }

        // Bad for whatever reason!
        return false;
    }

}
