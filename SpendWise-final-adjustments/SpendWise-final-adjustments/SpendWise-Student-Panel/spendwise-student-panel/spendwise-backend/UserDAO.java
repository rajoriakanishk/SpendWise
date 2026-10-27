import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import org.mindrot.jbcrypt.BCrypt;

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

public User authenticateUser(String email, String password)
        throws SQLException {

    User user = findUserByEmail(email);

    if (user == null) {
        return null;
    }

    String storedHash = user.getPasswordHash();

    // Placeholder values are not valid password hashes.
    if (storedHash == null || !storedHash.startsWith("$2")) {
        return null;
    }

    if (BCrypt.checkpw(password, storedHash)) {
        return user;
    }

    return null;
}

public int registerStudent(String fullName, String email, String password)
        throws SQLException {

    if (fullName == null || fullName.isBlank()
            || email == null || email.isBlank()
            || password == null || password.isBlank()) {
        throw new IllegalArgumentException(
                "Name, email, and password are required.");
    }

    if (password.length() < 8) {
        throw new IllegalArgumentException(
                "Password must be at least 8 characters long.");
    }

    if (findUserByEmail(email.trim()) != null) {
        throw new IllegalArgumentException(
                "An account with this email already exists.");
    }

    String passwordHash = BCrypt.hashpw(
            password, BCrypt.gensalt(12));

    User user = new User(
            0,
            fullName.trim(),
            email.trim().toLowerCase(java.util.Locale.ROOT),
            passwordHash,
            "STUDENT"
    );

    return createUser(user);
}


}
