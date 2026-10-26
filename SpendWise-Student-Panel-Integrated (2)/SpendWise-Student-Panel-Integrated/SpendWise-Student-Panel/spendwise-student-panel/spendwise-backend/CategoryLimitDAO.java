import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.LinkedHashMap;
import java.util.Map;

public class CategoryLimitDAO {

    public Map<String, BigDecimal> getLimits(int userId)
            throws SQLException {

        String sql = """
                SELECT category_name, limit_amount
                FROM category_limits
                WHERE user_id = ?
                """;

        Map<String, BigDecimal> limits = new LinkedHashMap<>();

        try (Connection connection = DatabaseConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {

            statement.setInt(1, userId);

            try (ResultSet result = statement.executeQuery()) {
                while (result.next()) {
                    limits.put(
                        result.getString("category_name"),
                        result.getBigDecimal("limit_amount")
                    );
                }
            }
        }

        return limits;
    }

    public void saveLimit(
            int userId,
            String categoryName,
            BigDecimal amount) throws SQLException {

        String sql = """
                INSERT INTO category_limits
                    (user_id, category_name, limit_amount)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    limit_amount = VALUES(limit_amount)
                """;

        try (Connection connection = DatabaseConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {

            statement.setInt(1, userId);
            statement.setString(2, categoryName);
            statement.setBigDecimal(3, amount);

            statement.executeUpdate();
        }
    }
}
