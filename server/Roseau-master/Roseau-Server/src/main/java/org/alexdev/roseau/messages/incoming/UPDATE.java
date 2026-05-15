package org.alexdev.roseau.messages.incoming;

import java.util.HashMap;
import java.util.Map;

import org.alexdev.roseau.game.player.Player;
import org.alexdev.roseau.messages.MessageEvent;
import org.alexdev.roseau.server.messages.ClientMessage;
import org.alexdev.roseau.util.Util;

public class UPDATE implements MessageEvent {

	@Override
	public void handle(Player player, ClientMessage reader) {
		if (reader.getMessageBody().contains("ph_figure")) {
			String poolFigure = reader.getMessageBody().substring(10);
			
			player.getDetails().setPoolFigure(poolFigure);
			player.getDetails().save();
			
			if (player.getRoomUser().getRoom() != null) {
				player.getRoomUser().getRoom().send(player.getRoomUser().getUsersComposer());
			}
		} else {
			Map<String, String> fields = parseUpdateFields(reader.getMessageBody());
			String password = fields.getOrDefault("password", "");
			String email = fields.getOrDefault("email", "");
			String figure = FigureString.normalize(fields.getOrDefault("figure", ""));
			String mission = Util.filterInput(fields.getOrDefault("customData", ""));
			String sex = fields.getOrDefault("sex", "");
			
			if (!sex.equals(player.getDetails().getSex())) {
				// Changed sex? Then we remove their opposite sex pool figure
				player.getDetails().setPoolFigure("");
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
			
			if (password.length() < 3) {
				return;
			}
			
			if (figure.length() < 3) {
				return;
			}
			
			player.getDetails().setPassword(password);
			player.getDetails().setEmail(email);
			player.getDetails().setFigure(figure);
			player.getDetails().setMission(mission);
			player.getDetails().setSex(sex);
			player.getDetails().save();
		}
	}

	private Map<String, String> parseUpdateFields(String body) {
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

}
