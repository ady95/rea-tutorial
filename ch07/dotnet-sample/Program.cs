using ReaLab.Shipping;

if (args.Length < 2)
{
    Console.WriteLine("usage: ShippingFee <weightGrams> <zone> [express]");
    return 1;
}

int weight = int.Parse(args[0]);
string zone = args[1];
bool express = args.Length > 2 && args[2] == "express";

int fee = ShippingCalculator.CalculateFee(weight, zone, express);
Console.WriteLine($"fee={fee}");
return 0;
