import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

public class UserDAO {

    public int createUser(User user) throws SQLException {
        String sql = """
                INSERT INTO users
                (full_name, email, password_hash, role)
                VALUES (?, ?, ?, ?)
                """;

        try (Connection connection = DatabaseConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(
                     sql, Statement.RETURN_GENERATED_KEYS)) {

            statement.setString(1, user.getFullName());
            statement.setString(2, user.getEmail());
            statement.setString(3, user.getPasswordHash());
            statement.setString(4, user.getRole());

            if (statement.executeUpdate() == 0) {
                throw new SQLException("User was not inserted.");
            }

            try (var keys = statement.getGeneratedKeys()) {
                if (keys.next()) {
                    return keys.getInt(1);
                }
            }

            throw new SQLException("No user ID was returned.");
        }
    }

    public User findUserByEmail(String email) throws SQLException {
        String sql = """
                SELECT id, full_name, email, password_hash, role
                FROM users
                WHERE email = ?
                """;

        try (Connection connection = DatabaseConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {

            statement.setString(1, email);

            try (var result = statement.executeQuery()) {
                if (result.next()) {
                    return new User(
                            result.getInt("id"),
                            result.getString("full_name"),
                            result.getString("email"),
                            result.getString("password_hash"),
                            result.getString("role"));
                }
                return null;
            }
        }
    }

    public List<User> getAllUsers() throws SQLException {
        List<User> users = new ArrayList<>();

        String sql = """
                SELECT id, full_name, email, password_hash, role
                FROM users
                ORDER BY id
                """;

        try (Connection connection = DatabaseConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql);
             var result = statement.executeQuery()) {

            while (result.next()) {
                users.add(new User(
                        result.getInt("id"),
                        result.getString("full_name"),
                        result.getString("email"),
                        result.getString("password_hash"),
                        result.getString("role")));
            }
        }

        return users;
    }
    
public User findUserById(int id) throws SQLException {
    String sql = """
            SELECT id, full_name, email, password_hash, role
            FROM users
            WHERE id = ?
            """;

    try (Connection connection = DatabaseConnection.getConnection();
         PreparedStatement statement = connection.prepareStatement(sql)) {

        statement.setInt(1, id);

        try (var result = statement.executeQuery()) {
            if (result.next()) {
                return new User(
                        result.getInt("id"),
                        result.getString("full_name"),
                        result.getString("email"),
                        result.getString("password_hash"),
                        result.getString("role"));
            }

            return null;
        }
    }
}

}
