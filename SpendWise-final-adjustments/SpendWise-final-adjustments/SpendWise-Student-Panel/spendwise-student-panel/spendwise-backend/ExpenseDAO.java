import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

public class ExpenseDAO {

    public int createExpense(
            Expense expense,
            String username,
            String password) throws SQLException {

        String sql = """
                INSERT INTO expenses
                (user_id, expense_date, description, category, amount)
                VALUES (?, ?, ?, ?, ?)
                """;

        try (Connection connection =
                     DatabaseConnection.getConnection();
             PreparedStatement statement =
                     connection.prepareStatement(
                             sql, Statement.RETURN_GENERATED_KEYS)) {

            statement.setInt(1, expense.getUserId());
            statement.setDate(
                    2, java.sql.Date.valueOf(expense.getExpenseDate()));
            statement.setString(3, expense.getDescription());
            statement.setString(4, expense.getCategory());
            statement.setBigDecimal(5, expense.getAmount());

            statement.executeUpdate();

            try (ResultSet keys = statement.getGeneratedKeys()) {
                if (keys.next()) {
                    return keys.getInt(1);
                }
            }

            throw new SQLException("Expense ID was not generated.");
        }
    }

    public List<Expense> getExpensesByUserId(
            int userId,
            String username,
            String password) throws SQLException {

        List<Expense> expenses = new ArrayList<>();

        String sql = """
                SELECT id, user_id, expense_date,
                       description, category, amount
                FROM expenses
                WHERE user_id = ?
                ORDER BY expense_date DESC, id DESC
                """;

        try (Connection connection =
                     DatabaseConnection.getConnection();
             PreparedStatement statement =
                     connection.prepareStatement(sql)) {

            statement.setInt(1, userId);

            try (ResultSet result = statement.executeQuery()) {
                while (result.next()) {
                    expenses.add(new Expense(
                            result.getInt("id"),
                            result.getInt("user_id"),
                            result.getDate("expense_date").toLocalDate(),
                            result.getString("description"),
                            result.getString("category"),
                            result.getBigDecimal("amount")
                    ));
                }
            }
        }

        return expenses;
    }

public boolean deleteExpense(int expenseId, int userId) throws SQLException {
    String sql = """
            DELETE FROM expenses
            WHERE id = ? AND user_id = ?
            """;

    try (Connection connection = DatabaseConnection.getConnection();
         PreparedStatement statement = connection.prepareStatement(sql)) {

        statement.setInt(1, expenseId);
        statement.setInt(2, userId);

        return statement.executeUpdate() > 0;
    }
}

}