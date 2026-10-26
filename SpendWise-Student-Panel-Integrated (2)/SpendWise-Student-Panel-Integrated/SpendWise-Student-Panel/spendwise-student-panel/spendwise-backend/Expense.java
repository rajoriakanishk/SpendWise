import java.math.BigDecimal;
import java.time.LocalDate;

public class Expense {

    private int id;
    private int userId;
    private LocalDate expenseDate;
    private String description;
    private String category;
    private BigDecimal amount;

    public Expense(
            int id,
            int userId,
            LocalDate expenseDate,
            String description,
            String category,
            BigDecimal amount) {

        this.id = id;
        this.userId = userId;
        this.expenseDate = expenseDate;
        this.description = description;
        this.category = category;
        this.amount = amount;
    }

    public Expense(
            int userId,
            LocalDate expenseDate,
            String description,
            String category,
            BigDecimal amount) {

        this(0, userId, expenseDate, description, category, amount);
    }

    public int getId() {
        return id;
    }

    public int getUserId() {
        return userId;
    }

    public LocalDate getExpenseDate() {
        return expenseDate;
    }

    public String getDescription() {
        return description;
    }

    public String getCategory() {
        return category;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setId(int id) {
        this.id = id;
    }
}