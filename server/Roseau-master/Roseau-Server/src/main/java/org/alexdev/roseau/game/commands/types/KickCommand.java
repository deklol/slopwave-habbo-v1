package org.alexdev.roseau.game.commands.types;

import org.alexdev.roseau.game.commands.Command;
import org.alexdev.roseau.game.player.Player;
import org.alexdev.roseau.game.room.Room;

public class KickCommand implements Command {

    @Override
    public void handleCommand(Player player, String message) {
        Room room = player.getRoomUser().getRoom();

        if (room == null || !room.hasRights(player, false)) {
            return;
        }

        String name = message.length() > 5 ? message.substring(5).trim() : "";
        if (name.length() == 0) {
            return;
        }

        Player target = room.getPlayerByName(name);
        if (target == null || target == player) {
            return;
        }

        if (target.hasPermission("room_kick_any_user") && !player.hasPermission("room_kick_any_user")) {
            return;
        }

        target.kick();
    }
}
