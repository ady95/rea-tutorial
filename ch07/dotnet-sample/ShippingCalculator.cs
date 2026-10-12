namespace ReaLab.Shipping;

public static class ShippingCalculator
{
    public static int CalculateFee(int weightGrams, string zone, bool express)
    {
        if (weightGrams <= 0)
            throw new ArgumentOutOfRangeException(nameof(weightGrams));

        int baseFee = zone switch
        {
            "domestic" => 3000,
            "jeju" => 6000,
            "overseas" => 15000,
            _ => throw new ArgumentException("unknown zone", nameof(zone)),
        };

        int extraKg = Math.Max(0, (weightGrams - 1) / 1000);
        int fee = baseFee + extraKg * 1000;

        if (express)
            fee = fee * 3 / 2;

        return fee;
    }
}
