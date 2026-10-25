import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

public class MonthlyBudgetDAO {

    public BigDecimal getBudget(int userId) throws SQLException {
        String sql = """
                SELECT budget_amount
                FROM monthly_budgets
                WHERE user_id = ?
                """;

        try (Connection connection = DatabaseConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {

            statement.setInt(1, userId);

            try (ResultSet result = statement.executeQuery()) {
                if (result.next()) {
                    return result.getBigDecimal("budget_amount");
                }
            }
        }

        // Default budget for a user who has not saved one yet.
        return new BigDecimal("5000.00");
    }

    public void saveBudget(int userId, BigDecimal amount)
            throws SQLException {

        String sql = """
                INSERT INTO monthly_budgets (user_id, budget_amount)
                VALUES (?, ?)
                ON DUPLICATE KEY UPDATE
                    budget_amount = VALUES(budget_amount)
                """;

        try (Connection connection = DatabaseConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {

            statement.setInt(1, userId);
            statement.setBigDecimal(2, amount);
            statement.executeUpdate();
        }
    }
}
