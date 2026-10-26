import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.math.BigDecimal;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

public class SpendWiseServer {

    private static final Map<String, Integer> sessions =
        new ConcurrentHashMap<>();

    public static void main(String[] args) throws IOException {
        HttpServer server = HttpServer.create(
                new InetSocketAddress("localhost", 8080), 0);
                server.createContext("/", exchange -> {
    addCorsHeaders(exchange);

    if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
        exchange.sendResponseHeaders(204, -1);
        exchange.close();
        return;
    }

    exchange.getHttpContext().getAttributes().put(
            "cors-handled", true);
});

        server.createContext("/api/health", exchange -> {
            addCorsHeaders(exchange);

if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
    exchange.sendResponseHeaders(204, -1);
    return;
}
            String response =
                    "{\"status\":\"ok\",\"message\":\"SpendWise API is running\"}";

            sendJson(exchange, 200, response);
        });

        server.createContext("/api/db-health", exchange -> {
            addCorsHeaders(exchange);

if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
    exchange.sendResponseHeaders(204, -1);
    return;
}
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
    addCorsHeaders(exchange);

    if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
        exchange.sendResponseHeaders(204, -1);
        exchange.close();
        return;
    }

    if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
        exchange.getResponseHeaders().set("Allow", "GET, OPTIONS");
        sendJson(exchange, 405,
                "{\"error\":\"Method not allowed\"}");
        return;
    }

    Integer sessionUserId = getSessionUserId(exchange);

    if (sessionUserId == null) {
        sendJson(exchange, 401,
                "{\"error\":\"Please sign in first\"}");
        return;
    }

    try {
        UserDAO userDAO = new UserDAO();
        User currentUser = userDAO.findUserById(sessionUserId);

        if (currentUser == null
                || !"ADMIN".equalsIgnoreCase(currentUser.getRole())) {
            sendJson(exchange, 403,
                    "{\"error\":\"Administrator access required\"}");
            return;
        }

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
    addCorsHeaders(exchange);

if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
    exchange.sendResponseHeaders(204, -1);
    return;
}
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

Integer sessionUserId = getSessionUserId(exchange);

if (sessionUserId == null) {
    sendJson(exchange, 401,
            "{\"error\":\"Please sign in first\"}");
    return;
}

UserDAO userDAO = new UserDAO();
User currentUser = userDAO.findUserById(sessionUserId);

if (currentUser == null) {
    sendJson(exchange, 401,
            "{\"error\":\"Invalid session. Please sign in again\"}");
    return;
}

if (!"ADMIN".equalsIgnoreCase(currentUser.getRole())
        && sessionUserId != id) {
    sendJson(exchange, 403,
            "{\"error\":\"You cannot access another user's profile\"}");
    return;
}

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

server.createContext("/api/login", exchange -> {
    addCorsHeaders(exchange);

    if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
        exchange.sendResponseHeaders(204, -1);
        return;
    }

    if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
        exchange.getResponseHeaders().set("Allow", "POST, OPTIONS");
        sendJson(exchange, 405,
                "{\"error\":\"Method not allowed\"}");
        return;
    }

    try {
        String body = new String(
                exchange.getRequestBody().readAllBytes(),
                java.nio.charset.StandardCharsets.UTF_8
        );

        java.util.Map<String, String> form = new java.util.HashMap<>();

        for (String pair : body.split("&")) {
            String[] parts = pair.split("=", 2);

            String key = java.net.URLDecoder.decode(
                    parts[0], java.nio.charset.StandardCharsets.UTF_8);

            String value = parts.length > 1
                    ? java.net.URLDecoder.decode(
                            parts[1], java.nio.charset.StandardCharsets.UTF_8)
                    : "";

            form.put(key, value);
        }

        String email = form.getOrDefault("email", "").trim();
        String password = form.getOrDefault("password", "");

        if (email.isEmpty() || password.isEmpty()) {
            sendJson(exchange, 400,
                    "{\"error\":\"Email and password are required\"}");
            return;
        }

        UserDAO userDAO = new UserDAO();
        User user = userDAO.authenticateUser(email, password);

        if (user == null) {
            sendJson(exchange, 401,
                    "{\"error\":\"Invalid email or password\"}");
            return;
        }

        if (!"STUDENT".equalsIgnoreCase(user.getRole())) {
            sendJson(exchange, 403,
                    "{\"error\":\"This login is for student accounts only\"}");
            return;
        }

        String sessionToken = UUID.randomUUID().toString();
        sessions.put(sessionToken, user.getId());

        exchange.getResponseHeaders().add(
        "Set-Cookie",
        "SPENDWISE_SESSION=" + sessionToken
                + "; HttpOnly; Path=/; SameSite=Lax"
);

String json = "{"
        + "\"id\":" + user.getId() + ","
        + "\"fullName\":\"" + escapeJson(user.getFullName()) + "\","
        + "\"email\":\"" + escapeJson(user.getEmail()) + "\","
        + "\"role\":\"" + escapeJson(user.getRole()) + "\""
        + "}";

sendJson(exchange, 200, json);

    } catch (SQLException e) {
        e.printStackTrace();
        sendJson(exchange, 500,
                "{\"error\":\"Unable to process login\"}");
    } catch (Exception e) {
        e.printStackTrace();
        sendJson(exchange, 400,
                "{\"error\":\"Invalid login request\"}");
    }
});

server.createContext("/api/register", exchange -> {
    addCorsHeaders(exchange);

    if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
        exchange.sendResponseHeaders(204, -1);
        exchange.close();
        return;
    }

    if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
        exchange.getResponseHeaders().set("Allow", "POST, OPTIONS");
        sendJson(exchange, 405, "{\"error\":\"Method not allowed\"}");
        return;
    }

    try {
        String body = new String(
                exchange.getRequestBody().readAllBytes(),
                StandardCharsets.UTF_8
        );

        Map<String, String> form = new HashMap<>();

        for (String pair : body.split("&")) {
            String[] parts = pair.split("=", 2);

            String key = URLDecoder.decode(
                    parts[0], StandardCharsets.UTF_8);

            String value = parts.length > 1
                    ? URLDecoder.decode(parts[1], StandardCharsets.UTF_8)
                    : "";

            form.put(key, value);
        }

        String fullName = form.getOrDefault("fullName", "").trim();
        String email = form.getOrDefault("email", "").trim();
        String password = form.getOrDefault("password", "");

        if (fullName.isEmpty() || email.isEmpty() || password.isEmpty()) {
            sendJson(exchange, 400,
                    "{\"error\":\"Name, email, and password are required\"}");
            return;
        }

        if (fullName.length() > 100 || email.length() > 254) {
            sendJson(exchange, 400,
                    "{\"error\":\"Name or email is too long\"}");
            return;
        }

        if (!email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            sendJson(exchange, 400,
                    "{\"error\":\"Enter a valid email address\"}");
            return;
        }

        int userId = new UserDAO().registerStudent(
                fullName, email, password);

        sendJson(exchange, 201,
                "{\"message\":\"Account created successfully\","
                        + "\"id\":" + userId + "}");

    } catch (IllegalArgumentException e) {
        sendJson(exchange, 400,
                "{\"error\":\"" + escapeJson(e.getMessage()) + "\"}");
    } catch (SQLException e) {
        e.printStackTrace();
        sendJson(exchange, 500,
                "{\"error\":\"Unable to create account\"}");
    } catch (Exception e) {
        e.printStackTrace();
        sendJson(exchange, 400,
                "{\"error\":\"Invalid registration request\"}");
    }
});


server.createContext("/api/logout", exchange -> {
    addCorsHeaders(exchange);

    if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
        exchange.sendResponseHeaders(204, -1);
        exchange.close();
        return;
    }

    if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
        exchange.getResponseHeaders().set("Allow", "POST, OPTIONS");
        sendJson(exchange, 405, "{\"error\":\"Method not allowed\"}");
        return;
    }

    List<String> cookies =
            exchange.getRequestHeaders().get("Cookie");

    if (cookies != null) {
        for (String cookieHeader : cookies) {
            for (String cookie : cookieHeader.split(";")) {
                String[] parts = cookie.trim().split("=", 2);

                if (parts.length == 2
                        && parts[0].equals("SPENDWISE_SESSION")) {
                    sessions.remove(parts[1]);
                }
            }
        }
    }

    exchange.getResponseHeaders().add(
            "Set-Cookie",
            "SPENDWISE_SESSION=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0"
    );

    sendJson(exchange, 200, "{\"message\":\"Logged out successfully\"}");
});


server.createContext("/api/expenses", exchange -> {
    addCorsHeaders(exchange);

    if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
        exchange.sendResponseHeaders(204, -1);
        return;
    }
    Integer loggedInUserId = getSessionUserId(exchange);

System.out.println(
        "SESSION USER ID: " + loggedInUserId
);
    String method = exchange.getRequestMethod();
    
Integer sessionUserId = getSessionUserId(exchange);

if (sessionUserId == null) {
    sendJson(exchange, 401,
            "{\"error\":\"Please sign in first\"}");
    return;
}


if ("POST".equalsIgnoreCase(method)) {
    handleCreateExpense(exchange);
    return;
}

if ("DELETE".equalsIgnoreCase(method)) {
    String path = exchange.getRequestURI().getPath();
    String[] parts = path.split("/");

    if (parts.length != 4 || !"expenses".equals(parts[2])) {
        sendJson(exchange, 400, "{\"error\":\"Invalid expense URL\"}");
        return;
    }

    try {
        int expenseId = Integer.parseInt(parts[3]);
        int userId = sessionUserId;

        boolean deleted = new ExpenseDAO().deleteExpense(expenseId, userId);

        if (deleted) {
            sendJson(exchange, 200, "{\"message\":\"Expense deleted successfully\"}");
        } else {
            sendJson(exchange, 404, "{\"error\":\"Expense not found\"}");
        }
    } catch (NumberFormatException e) {
        sendJson(exchange, 400, "{\"error\":\"Invalid expense ID\"}");
    } catch (SQLException e) {
        e.printStackTrace();
        sendJson(exchange, 500, "{\"error\":\"Unable to delete expense\"}");
    }

    return;
}

if (!"GET".equalsIgnoreCase(method)) {
    exchange.getResponseHeaders().set("Allow", "GET, POST, OPTIONS");
    sendJson(exchange, 405,
            "{\"error\":\"Method not allowed\"}");
    return;
}

    String query = exchange.getRequestURI().getQuery();
String userIdText = null;

if (query != null) {
    for (String parameter : query.split("&")) {
        String[] parts = parameter.split("=", 2);

        if (parts.length == 2 && parts[0].equals("userId")) {
            userIdText = parts[1];
            break;
        }
    }
}

if (userIdText == null) {
    sendJson(exchange, 400,
            "{\"error\":\"Please provide userId\"}");
    return;
}


try {
    int requestedUserId = Integer.parseInt(userIdText);

if (requestedUserId != sessionUserId) {
    sendJson(exchange, 403,
            "{\"error\":\"You cannot access another user's expenses\"}");
    return;
}

int userId = sessionUserId;

        if (userId <= 0) {
            sendJson(exchange, 400,
                    "{\"error\":\"Invalid userId\"}");
            return;
        }

        ExpenseDAO expenseDAO = new ExpenseDAO();

        java.util.List<Expense> expenses =
                expenseDAO.getExpensesByUserId(
                        userId, "", "");

        StringBuilder json = new StringBuilder("[");
        boolean first = true;

        for (Expense expense : expenses) {
            if (!first) {
                json.append(",");
            }
            first = false;

            json.append("{")
                .append("\"id\":").append(expense.getId()).append(",")
                .append("\"userId\":").append(expense.getUserId()).append(",")
                .append("\"date\":\"")
                .append(expense.getExpenseDate()).append("\",")
                .append("\"description\":\"")
                .append(escapeJson(expense.getDescription())).append("\",")
                .append("\"category\":\"")
                .append(escapeJson(expense.getCategory())).append("\",")
                .append("\"amount\":").append(expense.getAmount())
                .append("}");
        }

        json.append("]");
        sendJson(exchange, 200, json.toString());

    } catch (NumberFormatException e) {
        sendJson(exchange, 400,
                "{\"error\":\"Invalid userId\"}");
    } catch (SQLException e) {
        e.printStackTrace();
        sendJson(exchange, 500,
                "{\"error\":\"Unable to retrieve expenses\"}");
    }
});

server.createContext("/api/budget", exchange -> {
    addCorsHeaders(exchange);

    if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
        exchange.sendResponseHeaders(204, -1);
        exchange.close();
        return;
    }

    Integer userId = getSessionUserId(exchange);

    if (userId == null) {
        sendJson(exchange, 401,
                "{\"error\":\"Please sign in first\"}");
        return;
    }

    String method = exchange.getRequestMethod();
    MonthlyBudgetDAO budgetDAO = new MonthlyBudgetDAO();

    try {
        if ("GET".equalsIgnoreCase(method)) {
            java.math.BigDecimal amount = budgetDAO.getBudget(userId);

            sendJson(exchange, 200,
                    "{\"budgetAmount\":" + amount.toPlainString() + "}");
            return;
        }

        if ("POST".equalsIgnoreCase(method)) {
            String body = new String(
                    exchange.getRequestBody().readAllBytes(),
                    StandardCharsets.UTF_8);

            Map<String, String> form = new HashMap<>();

            for (String pair : body.split("&")) {
                String[] parts = pair.split("=", 2);

                String key = URLDecoder.decode(
                        parts[0], StandardCharsets.UTF_8);

                String value = parts.length > 1
                        ? URLDecoder.decode(
                                parts[1], StandardCharsets.UTF_8)
                        : "";

                form.put(key, value);
            }

            java.math.BigDecimal amount =
                    new java.math.BigDecimal(
                            form.getOrDefault("amount", ""));

            if (amount.compareTo(java.math.BigDecimal.ZERO) <= 0
                    || amount.scale() > 2
                    || amount.precision() > 10) {
                sendJson(exchange, 400,
                        "{\"error\":\"Enter a valid positive budget amount\"}");
                return;
            }

            budgetDAO.saveBudget(userId, amount);

            sendJson(exchange, 200,
                    "{\"message\":\"Budget saved successfully\","
                            + "\"budgetAmount\":" + amount.toPlainString() + "}");
            return;
        }

        exchange.getResponseHeaders().set("Allow", "GET, POST, OPTIONS");
        sendJson(exchange, 405,
                "{\"error\":\"Method not allowed\"}");

    } catch (NumberFormatException e) {
        sendJson(exchange, 400,
                "{\"error\":\"Enter a valid budget amount\"}");
    } catch (SQLException e) {
        e.printStackTrace();
        sendJson(exchange, 500,
                "{\"error\":\"Unable to save or load budget\"}");
    }
});

server.createContext("/api/category-limits", exchange -> {
    addCorsHeaders(exchange);

    if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
        exchange.sendResponseHeaders(204, -1);
        exchange.close();
        return;
    }

    Integer userId = getSessionUserId(exchange);

    if (userId == null) {
        sendJson(exchange, 401,
                "{\"error\":\"Please sign in first\"}");
        return;
    }

    String method = exchange.getRequestMethod();
    CategoryLimitDAO dao = new CategoryLimitDAO();

    Set<String> validCategories = Set.of(
            "Food", "Transport", "Education", "Entertainment",
            "Shopping", "Health", "Bills", "Other"
    );

    try {
        if ("GET".equalsIgnoreCase(method)) {
            Map<String, BigDecimal> limits = dao.getLimits(userId);
            StringBuilder json = new StringBuilder("{");
            boolean first = true;

            for (String category : validCategories) {
                if (!first) {
                    json.append(",");
                }
                first = false;

                BigDecimal amount = limits.get(category);
                json.append("\"")
                    .append(category)
                    .append("\":")
                    .append(amount == null ? "null" : amount.toPlainString());
            }

            json.append("}");
            sendJson(exchange, 200, json.toString());
            return;
        }

        if ("POST".equalsIgnoreCase(method)) {
            String body = new String(
                    exchange.getRequestBody().readAllBytes(),
                    StandardCharsets.UTF_8
            );

            Map<String, String> form = new HashMap<>();

            for (String pair : body.split("&")) {
                String[] parts = pair.split("=", 2);

                String key = URLDecoder.decode(
                        parts[0], StandardCharsets.UTF_8);

                String value = parts.length > 1
                        ? URLDecoder.decode(
                                parts[1], StandardCharsets.UTF_8)
                        : "";

                form.put(key, value);
            }

            String category = form.getOrDefault("category", "").trim();
            String amountText = form.getOrDefault("amount", "").trim();

            if (!validCategories.contains(category)) {
                sendJson(exchange, 400,
                        "{\"error\":\"Invalid expense category\"}");
                return;
            }

            BigDecimal amount = new BigDecimal(amountText);

            if (amount.compareTo(BigDecimal.ZERO) < 0
                    || amount.scale() > 2
                    || amount.precision() > 10) {
                sendJson(exchange, 400,
                        "{\"error\":\"Enter a valid non-negative limit\"}");
                return;
            }

            dao.saveLimit(userId, category, amount);

            sendJson(exchange, 200,
                    "{\"message\":\"Category limit saved successfully\"}");
            return;
        }

        exchange.getResponseHeaders().set("Allow", "GET, POST, OPTIONS");
        sendJson(exchange, 405,
                "{\"error\":\"Method not allowed\"}");

    } catch (NumberFormatException e) {
        sendJson(exchange, 400,
                "{\"error\":\"Enter a valid limit amount\"}");
    } catch (SQLException e) {
        e.printStackTrace();
        sendJson(exchange, 500,
                "{\"error\":\"Unable to load or save category limits\"}");
    }
});

server.createContext("/api/savings-goals", exchange -> {
    addCorsHeaders(exchange);

    if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
        exchange.sendResponseHeaders(204, -1);
        exchange.close();
        return;
    }

    Integer userId = getSessionUserId(exchange);

    if (userId == null) {
        sendJson(exchange, 401,
                "{\"error\":\"Please sign in first\"}");
        return;
    }

    String method = exchange.getRequestMethod();
    SavingsGoalDAO dao = new SavingsGoalDAO();

    try {
        if ("GET".equalsIgnoreCase(method)) {
            List<SavingsGoalDAO.SavingsGoal> goals =
                    dao.getGoals(userId);

            StringBuilder json = new StringBuilder("[");
            boolean first = true;

            for (SavingsGoalDAO.SavingsGoal goal : goals) {
                if (!first) {
                    json.append(",");
                }
                first = false;

                json.append("{")
                    .append("\"id\":").append(goal.id).append(",")
                    .append("\"name\":\"").append(escapeJson(goal.name)).append("\",")
                    .append("\"target\":").append(goal.target.toPlainString()).append(",")
                    .append("\"saved\":").append(goal.saved.toPlainString()).append(",")
                    .append("\"icon\":\"").append(escapeJson(goal.icon == null ? "🎯" : goal.icon)).append("\",")
                    .append("\"date\":\"").append(escapeJson(goal.date == null ? "" : goal.date)).append("\"")
                    .append("}");
            }

            json.append("]");
            sendJson(exchange, 200, json.toString());
            return;
        }

        if ("POST".equalsIgnoreCase(method)
                || "PUT".equalsIgnoreCase(method)
                || "DELETE".equalsIgnoreCase(method)) {

            String body = new String(
                    exchange.getRequestBody().readAllBytes(),
                    StandardCharsets.UTF_8
            );

            Map<String, String> form = new HashMap<>();

            for (String pair : body.split("&")) {
                if (pair.isEmpty()) continue;

                String[] parts = pair.split("=", 2);
                String key = URLDecoder.decode(
                        parts[0], StandardCharsets.UTF_8);
                String value = parts.length > 1
                        ? URLDecoder.decode(
                                parts[1], StandardCharsets.UTF_8)
                        : "";

                form.put(key, value);
            }

            int goalId = 0;
            if (!form.getOrDefault("id", "").isBlank()) {
                goalId = Integer.parseInt(form.get("id"));
            }

            if ("DELETE".equalsIgnoreCase(method)) {
                if (goalId <= 0 || !dao.deleteGoal(userId, goalId)) {
                    sendJson(exchange, 404,
                            "{\"error\":\"Savings goal not found\"}");
                    return;
                }

                sendJson(exchange, 200,
                        "{\"message\":\"Savings goal deleted\"}");
                return;
            }

            if ("addSavings".equals(form.get("action"))) {
                BigDecimal amount = new BigDecimal(
                        form.getOrDefault("amount", ""));

                if (goalId <= 0 || amount.compareTo(BigDecimal.ZERO) <= 0
                        || amount.scale() > 2 || amount.precision() > 10) {
                    sendJson(exchange, 400,
                            "{\"error\":\"Enter a valid positive savings amount\"}");
                    return;
                }

                if (!dao.addSavings(userId, goalId, amount)) {
                    sendJson(exchange, 404,
                            "{\"error\":\"Savings goal not found\"}");
                    return;
                }

                sendJson(exchange, 200,
                        "{\"message\":\"Savings added successfully\"}");
                return;
            }

            String name = form.getOrDefault("name", "").trim();
            String targetText = form.getOrDefault("target", "").trim();
            String savedText = form.getOrDefault("saved", "0").trim();
            String icon = form.getOrDefault("icon", "🎯").trim();
            String date = form.getOrDefault("date", "").trim();

            if (name.isEmpty() || name.length() > 100
                    || targetText.isEmpty() || savedText.isEmpty()) {
                sendJson(exchange, 400,
                        "{\"error\":\"Enter a valid goal name and amounts\"}");
                return;
            }

            BigDecimal target = new BigDecimal(targetText);
            BigDecimal saved = new BigDecimal(savedText);

            if (target.compareTo(BigDecimal.ZERO) <= 0
                    || saved.compareTo(BigDecimal.ZERO) < 0
                    || target.scale() > 2 || saved.scale() > 2
                    || target.precision() > 10 || saved.precision() > 10
                    || icon.length() > 20) {
                sendJson(exchange, 400,
                        "{\"error\":\"Enter valid goal amounts and icon\"}");
                return;
            }

            if (!date.isEmpty()) {
                java.time.LocalDate.parse(date);
            }

            if ("POST".equalsIgnoreCase(method)) {
                int newId = dao.createGoal(
                        userId, name, target, saved, icon, date);

                sendJson(exchange, 201,
                        "{\"id\":" + newId + ",\"message\":\"Savings goal created\"}");
                return;
            }

            if (goalId <= 0 || !dao.updateGoal(
                    userId, goalId, name, target, saved, icon, date)) {
                sendJson(exchange, 404,
                        "{\"error\":\"Savings goal not found\"}");
                return;
            }

            sendJson(exchange, 200,
                    "{\"message\":\"Savings goal updated\"}");
            return;
        }

        exchange.getResponseHeaders().set(
                "Allow", "GET, POST, PUT, DELETE, OPTIONS");
        sendJson(exchange, 405,
                "{\"error\":\"Method not allowed\"}");

    } catch (NumberFormatException | java.time.DateTimeException e) {
        sendJson(exchange, 400,
                "{\"error\":\"Invalid goal amount, ID, or date\"}");
    } catch (SQLException e) {
        e.printStackTrace();
        sendJson(exchange, 500,
                "{\"error\":\"Unable to process savings goal\"}");
    }
});

        server.start();

        System.out.println("SpendWise API is running!");
        System.out.println("USER ROUTE VERSION 2");
        System.out.println("Server: http://localhost:8080/api/health");
        System.out.println("Database: http://localhost:8080/api/db-health");
        System.out.println("Press Ctrl+C to stop the server.");
    }

    
private static void addCorsHeaders(HttpExchange exchange) {
    exchange.getResponseHeaders().set(
            "Access-Control-Allow-Origin",
            "http://localhost:5500");

    exchange.getResponseHeaders().set(
            "Access-Control-Allow-Credentials", "true");

    exchange.getResponseHeaders().set(
            "Access-Control-Allow-Methods",
            "GET, POST, PUT, DELETE, OPTIONS");

    exchange.getResponseHeaders().set(
            "Access-Control-Allow-Headers",
            "Content-Type, Authorization");
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
private static void handleCreateExpense(HttpExchange exchange)
        throws IOException {

    try {
        // Read the form data sent by the frontend.
        byte[] bodyBytes = exchange.getRequestBody().readAllBytes();
        String body = new String(bodyBytes, StandardCharsets.UTF_8);

        Map<String, String> form = new HashMap<>();

        for (String pair : body.split("&")) {
            String[] parts = pair.split("=", 2);

            String key = URLDecoder.decode(
                    parts[0], StandardCharsets.UTF_8);

            String value = parts.length > 1
                    ? URLDecoder.decode(parts[1], StandardCharsets.UTF_8)
                    : "";

            form.put(key, value);
        }

        // Get and validate the submitted values.
        
        // Get the student ID from the authenticated session.
        Integer sessionUserId = getSessionUserId(exchange);

        if (sessionUserId == null) {
            sendJson(exchange, 401,
                    "{\"error\":\"Please sign in first\"}");
            return;
        }

        int userId = sessionUserId;

        // Read the remaining expense details from the form.
        LocalDate expenseDate =
                LocalDate.parse(form.get("expenseDate"));

        String description = form.get("description");
        String category = form.get("category");
        BigDecimal amount = new BigDecimal(form.get("amount"));

        if (description == null || description.isBlank()
                || category == null || category.isBlank()
                || amount.compareTo(BigDecimal.ZERO) <= 0) {

            sendJson(exchange, 400,
                    "{\"error\":\"Please provide valid expense details.\"}");
            return;
        }

        // Create the expense and save it to MySQL.
        Expense expense = new Expense(
                userId,
                expenseDate,
                description,
                category,
                amount
        );

        ExpenseDAO dao = new ExpenseDAO();

        int newId = dao.createExpense(expense, "", "");

        sendJson(exchange, 201,
                "{\"message\":\"Expense saved successfully\","
                        + "\"id\":" + newId + "}");

    } catch (SQLException e) {
        e.printStackTrace();

        sendJson(exchange, 500,
                "{\"error\":\"Could not save expense to the database.\"}");

    } catch (RuntimeException e) {
        sendJson(exchange, 400,
                "{\"error\":\"Invalid expense data. Check the date and amount.\"}");
    }
}

private static Integer getSessionUserId(HttpExchange exchange) {
    List<String> cookies =
            exchange.getRequestHeaders().get("Cookie");

    if (cookies == null) {
        return null;
    }

    for (String cookieHeader : cookies) {
        for (String cookie : cookieHeader.split(";")) {
            String[] parts = cookie.trim().split("=", 2);

            if (parts.length == 2
                    && parts[0].equals("SPENDWISE_SESSION")) {
                return sessions.get(parts[1]);
            }
        }
    }

    return null;
}

}
