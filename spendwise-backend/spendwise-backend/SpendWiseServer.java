import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.List;

public class SpendWiseServer {

    public static void main(String[] args) throws IOException {
        HttpServer server = HttpServer.create(
                new InetSocketAddress("localhost", 8080), 0);

        server.createContext("/api/health", exchange -> {
            String response =
                    "{\"status\":\"ok\",\"message\":\"SpendWise API is running\"}";

            sendJson(exchange, 200, response);
        });

        server.createContext("/api/db-health", exchange -> {
            try (Connection connection = DatabaseConnection.getConnection()) {
                String response =
                        "{\"status\":\"ok\",\"database\":\"connected\"}";

                sendJson(exchange, 200, response);

            } catch (SQLException e) {
                e.printStackTrace();

                String response =
                        "{\"status\":\"error\",\"database\":\"unavailable\"}";

                sendJson(exchange, 500, response);
            }
        });
        
server.createContext("/api/users", exchange -> {
    if (!"GET".equals(exchange.getRequestMethod())) {
        exchange.getResponseHeaders().set("Allow", "GET");
        sendJson(exchange, 405,
                "{\"error\":\"Method not allowed\"}");
        return;
    }

    try {
        UserDAO userDAO = new UserDAO();
        List<User> users = userDAO.getAllUsers();

        StringBuilder json = new StringBuilder("[");
        boolean first = true;

        for (User user : users) {
            if (!first) {
                json.append(",");
            }
            first = false;

            json.append("{")
                .append("\"id\":").append(user.getId()).append(",")
                .append("\"fullName\":\"")
                .append(escapeJson(user.getFullName())).append("\",")
                .append("\"email\":\"")
                .append(escapeJson(user.getEmail())).append("\",")
                .append("\"role\":\"")
                .append(escapeJson(user.getRole())).append("\"")
                .append("}");
        }

        json.append("]");
        sendJson(exchange, 200, json.toString());

    } catch (SQLException e) {
        e.printStackTrace();
        sendJson(exchange, 500,
                "{\"error\":\"Unable to retrieve users\"}");
    }
});
    
server.createContext("/api/user", exchange -> {
    if (!"GET".equals(exchange.getRequestMethod())) {
        exchange.getResponseHeaders().set("Allow", "GET");
        sendJson(exchange, 405,
                "{\"error\":\"Method not allowed\"}");
        return;
    }

    String path = exchange.getRequestURI().getPath();
    System.out.println("USER ROUTE RECEIVED: " + path);
    String[] parts = path.split("/");

    if (parts.length != 4 || !parts[3].matches("\\d+")) {
        sendJson(exchange, 400,
                "{\"error\":\"Please provide a valid user ID\"}");
        return;
    }

    try {
        int id = Integer.parseInt(parts[3]);
        UserDAO userDAO = new UserDAO();
        User user = userDAO.findUserById(id);

        if (user == null) {
            sendJson(exchange, 404,
                    "{\"error\":\"User not found\"}");
            return;
        }

        String json = "{"
                + "\"id\":" + user.getId() + ","
                + "\"fullName\":\""
                + escapeJson(user.getFullName()) + "\","
                + "\"email\":\""
                + escapeJson(user.getEmail()) + "\","
                + "\"role\":\""
                + escapeJson(user.getRole()) + "\""
                + "}";

        sendJson(exchange, 200, json);

    } catch (NumberFormatException e) {
        sendJson(exchange, 400,
                "{\"error\":\"Invalid user ID\"}");
    } catch (SQLException e) {
        e.printStackTrace();
        sendJson(exchange, 500,
                "{\"error\":\"Unable to retrieve user\"}");
    }
});


        server.start();

        System.out.println("SpendWise API is running!");
        System.out.println("USER ROUTE VERSION 2");
        System.out.println("Server: http://localhost:8080/api/health");
        System.out.println("Database: http://localhost:8080/api/db-health");
        System.out.println("Press Ctrl+C to stop the server.");
    }

    private static void sendJson(
            HttpExchange exchange, int status, String response)
            throws IOException {

        exchange.getResponseHeaders().set(
                "Content-Type", "application/json; charset=UTF-8");

        byte[] bytes = response.getBytes(java.nio.charset.StandardCharsets.UTF_8);

        exchange.sendResponseHeaders(status, bytes.length);

        try (OutputStream output = exchange.getResponseBody()) {
            output.write(bytes);
        }
    }
    
private static String escapeJson(String value) {
    if (value == null) {
        return "";
    }

    return value.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
}

}
