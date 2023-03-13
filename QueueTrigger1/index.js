module.exports = async function (context, myQueueItem) {
    // context.log('JavaScript queue trigger function processed work item', myQueueItem);
    context.log(myQueueItem);
  
    const fetcher = await import("node-fetch");
    const inventory_url=process.env.INVENTORY_URL;
    const order_url=process.env.ORDER_URL;
    const inventory_key=process.env.INVENTORY_KEY;
    const order_key=process.env.ORDER_KEY;
    var oResult, pResult, updateProdRes, updateOrderRes;
    var updatedOrder;
    //Call Orders api
    try {
      oResult = await fetcher.default(
        order_url+"order/" +
          myQueueItem +
          "?subscription-key="+order_key
      );
    } catch (error) {
      context.log(error);
    }
  
    if (oResult.ok) {
      var oJson = await oResult.json();
      context.log(oJson.pId);
      var orderCount = oJson.count;
      //Call products api
      try {
        pResult = await fetcher.default(
          inventory_url+"product/" +
            oJson.pId +
            "?subscription-key="+inventory_key
        );
      } catch (error) {
        context.log(error);
      }
      if (pResult.ok) {
        var pJson = await pResult.json();
        context.log(pJson);
        //check validity of order
        if (pJson.quantity >= orderCount) {
          //reduce the product quantity
          try {
            var updatedProduct = {
              productId: pJson.productId,
              productName: pJson.productName,
              quantity: pJson.quantity - orderCount,
              description: pJson.description,
              factoryId: pJson.factoryId,
              picLink: pJson.picLink,
            };
            updateProdRes = await fetcher.default(
              inventory_url+"edit-product?subscription-key="+inventory_key,
              {
                headers: {
                  "Content-Type": "application/json",
                },
                method: "PUT",
                body: JSON.stringify(updatedProduct),
              }
            );
          } catch (error) {
            context.log(error);
          }
          if (updateProdRes.ok) {
            console.log(await updateProdRes.json());
            //update order as placed
            updatedOrder = {
              orderId: oJson.orderId,
              pId: oJson.pId,
              count: oJson.count,
              time: oJson.time,
              status: " ORDER PLACED!",
            };
          }
        } else {
          updatedOrder = {
            orderId: oJson.orderId,
            pId: oJson.pId,
            count: oJson.count,
            time: oJson.time,
            status: " INVALID ORDER!",
          };
        }
  
        try {
          updateOrderRes = await fetcher.default(
            order_url+"status?subscription-key="+order_key,
            {
              headers: {
                "Content-Type": "application/json",
              },
              method: "PUT",
              body: JSON.stringify(updatedOrder),
            }
          );
        } catch (error) {
          context.log(error);
        }
  
        if (updateOrderRes.ok) {
          context.log("ORDER Processed !");
        }
      }
    }
  };
