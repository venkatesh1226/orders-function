module.exports = async function (context, myQueueItem) {
    // context.log('JavaScript queue trigger function processed work item', myQueueItem);
    context.log(myQueueItem);
  
    const fetcher = await import("node-fetch");
    var oResult, pResult, updateProdRes, updateOrderRes;
    var updatedOrder;
    //Call Orders api
    try {
      oResult = await fetcher.default(
        "https://apim-get-assessment.azure-api.net/venkatesh-orders/order/" +
          myQueueItem +
          "?subscription-key=19cbbdf0787443b68f2b36bbdeb11459"
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
          "https://apim-get-assessment.azure-api.net/venkatesh/product/" +
            oJson.pId +
            "?subscription-key=f5722ad8c9f043689b211295faed5500"
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
              "https://apim-get-assessment.azure-api.net/venkatesh/edit-product?subscription-key=f5722ad8c9f043689b211295faed5500",
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
            "https://apim-get-assessment.azure-api.net/venkatesh-orders/status?subscription-key=19cbbdf0787443b68f2b36bbdeb11459",
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