package org.alexdev.roseau.messages.incoming;

import java.util.LinkedHashMap;
import java.util.Map;

final class FigureString {

    private static final String[] PART_ORDER = new String[] {
        "sd", "hr", "hd", "ey", "fc", "bd", "lh", "rh", "ch", "ls", "rs", "lg", "sh"
    };

    private static final Map<String, String> SOURCE_DEFAULTS = new LinkedHashMap<String, String>();

    static {
        SOURCE_DEFAULTS.put("sd", "sd=001/0");
        SOURCE_DEFAULTS.put("hr", "hr=001/255,255,255");
        SOURCE_DEFAULTS.put("hd", "hd=002/255,204,153");
        SOURCE_DEFAULTS.put("ey", "ey=001/0");
        SOURCE_DEFAULTS.put("fc", "fc=001/255,204,153");
        SOURCE_DEFAULTS.put("bd", "bd=001/255,204,153");
        SOURCE_DEFAULTS.put("lh", "lh=001/255,204,153");
        SOURCE_DEFAULTS.put("rh", "rh=001/255,204,153");
        SOURCE_DEFAULTS.put("ch", "ch=001/232,177,55");
        SOURCE_DEFAULTS.put("ls", "ls=001/232,177,55");
        SOURCE_DEFAULTS.put("rs", "rs=001/232,177,55");
        SOURCE_DEFAULTS.put("lg", "lg=001/119,159,187");
        SOURCE_DEFAULTS.put("sh", "sh=001/175,220,223");
    }

    private FigureString() {
    }

    static String normalize(String figure) {
        Map<String, String> incoming = parseFigure(figure);
        StringBuilder builder = new StringBuilder();

        for (String part : PART_ORDER) {
            if (builder.length() > 0) {
                builder.append("&");
            }
            builder.append(normalizePart(part, incoming.get(part)));
        }

        return builder.toString();
    }

    private static Map<String, String> parseFigure(String figure) {
        Map<String, String> incoming = new LinkedHashMap<String, String>();
        if (figure == null) {
            return incoming;
        }

        String[] entries = figure.split("&");
        for (String entry : entries) {
            int separator = entry.indexOf("=");
            if (separator <= 0) {
                continue;
            }

            String part = entry.substring(0, separator).trim().toLowerCase();
            if (SOURCE_DEFAULTS.containsKey(part)) {
                incoming.put(part, entry.trim());
            }
        }
        return incoming;
    }

    private static String normalizePart(String part, String entry) {
        String fallback = SOURCE_DEFAULTS.get(part);
        String[] fallbackPieces = fallback.split("/", 2);
        String fallbackPart = fallbackPieces[0];
        String fallbackColor = fallbackPieces.length > 1 ? fallbackPieces[1] : "0";

        if (entry == null || entry.trim().length() == 0) {
            return fallback;
        }

        String[] pieces = entry.trim().split("/", 2);
        String partValue = pieces.length > 0 ? pieces[0].trim() : fallbackPart;
        String colorValue = pieces.length > 1 ? pieces[1].trim() : "";

        int equals = partValue.indexOf("=");
        String id = equals >= 0 ? partValue.substring(equals + 1).trim() : "";
        if (id.length() == 0) {
            id = fallbackPart.substring(fallbackPart.indexOf("=") + 1);
        }

        return part + "=" + normalizePartId(id) + "/" + normalizeColor(colorValue, fallbackColor);
    }

    private static String normalizePartId(String id) {
        try {
            int number = Integer.parseInt(id);
            if (number < 0) {
                return "001";
            }
            String text = Integer.toString(number);
            while (text.length() < 3) {
                text = "0" + text;
            }
            return text;
        } catch (NumberFormatException ignored) {
            return id.length() == 0 ? "001" : id;
        }
    }

    private static String normalizeColor(String color, String fallback) {
        if ("0".equals(fallback) && "0".equals(color)) {
            return "0";
        }

        if (isRgb(color)) {
            return color;
        }

        if (color != null && color.startsWith("*") && color.length() == 7) {
            try {
                int value = Integer.parseInt(color.substring(1), 16);
                return ((value >> 16) & 255) + "," + ((value >> 8) & 255) + "," + (value & 255);
            } catch (NumberFormatException ignored) {
                return fallback;
            }
        }

        return fallback;
    }

    private static boolean isRgb(String color) {
        if (color == null) {
            return false;
        }

        String[] parts = color.split(",", -1);
        if (parts.length != 3) {
            return false;
        }

        for (String part : parts) {
            try {
                int value = Integer.parseInt(part.trim());
                if (value < 0 || value > 255) {
                    return false;
                }
            } catch (NumberFormatException ignored) {
                return false;
            }
        }
        return true;
    }
}
