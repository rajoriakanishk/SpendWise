import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class DatabaseConnection {

    private static final String URL =
            "jdbc:mysql://localhost:3306/spendwise";

    public static Connection getConnection()
            throws SQLException {

        String username = System.getenv("SPENDWISE_DB_USER");
        String password = System.getenv("SPENDWISE_DB_PASSWORD");

        if (username == null || username.isBlank()
                || password == null || password.isBlank()) {
            throw new SQLException(
                    "Database credentials are not configured.");
        }

        return DriverManager.getConnection(URL, username, password);
    }

    public static void main(String[] args) {
        try (Connection connection = getConnection()) {
            System.out.println("Connected to SpendWise database!");
            System.out.println("Connection is working: "
                    + !connection.isClosed());

        } catch (SQLException e) {
            System.out.println("Database connection failed: "
                    + e.getMessage());
        }
    }
}
